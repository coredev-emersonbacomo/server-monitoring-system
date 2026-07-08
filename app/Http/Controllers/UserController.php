<?php

namespace App\Http\Controllers;

use App\Data\UpdateUserData;
use App\Data\CreateUserData;
use App\Models\User;
use App\Jobs\DeleteStorageAsset;
use App\Services\MediaUrlService;
use App\Services\UploadIntentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Data\UserData;
use App\Models\CustomActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
        private readonly MediaUrlService $mediaUrlService,
    ) {}

    public function index()
    {
        $users = User::orderBy('created_at', 'desc')->get();

        return $users->map(fn(User $u) => UserData::fromModel($u));
    }

    public function store(CreateUserData $data)
    {
        $payload = [
            'first_name' => $data->first_name,
            'last_name'  => $data->last_name,
            'email'      => $data->email,
            'phone_number' => $data->phone_number,
            'username'   => $data->username,
            'password'   => Hash::make($data->password),
        ];

        if ($data->upload_intent_id !== null && $data->profile_picture_storage_key !== null) {
            $intent = $this->uploadIntentService->attach(
                $data->upload_intent_id,
                request()->user(),
                null,
                'user',
            );

            $payload['profile_picture_storage_key'] = $data->profile_picture_storage_key;
            $payload['profile_picture_url'] = $this->mediaUrlService->profilePicture($data->profile_picture_storage_key);
        }

        $user = User::create($payload);

        if (isset($intent)) {
            $intent->update([
                'attached_to_type' => 'user',
                'attached_to_id' => $user->id,
            ]);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Create User',
            'details' => [
                'message' => "Created user account: {$user->username}",
                'username' => $user->username,
                'email' => $user->email,
            ],
        ]);
    }

    public function show(User $user): UserData
    {
        return UserData::fromModel($user);
    }

    public function update(UpdateUserData $data, User $user)
    {
        $payload = [];

        if (!($data->first_name instanceof \Spatie\LaravelData\Optional)) {
            $payload['first_name'] = $data->first_name;
        }
        if (!($data->last_name instanceof \Spatie\LaravelData\Optional)) {
            $payload['last_name'] = $data->last_name;
        }
        if (!($data->email instanceof \Spatie\LaravelData\Optional)) {
            $payload['email'] = $data->email;
        }
        if (!($data->phone_number instanceof \Spatie\LaravelData\Optional)) {
            $payload['phone_number'] = $data->phone_number;
        }
        if (!($data->username instanceof \Spatie\LaravelData\Optional)) {
            $payload['username'] = $data->username;
        }
        if (!($data->password instanceof \Spatie\LaravelData\Optional) && $data->password !== null) {
            $payload['password'] = Hash::make($data->password);
        }

        if (!($data->upload_intent_id instanceof \Spatie\LaravelData\Optional) && $data->upload_intent_id !== null) {
            $oldStorageKey = $user->profile_picture_storage_key;
            $oldFolder = config('uploads.purposes.profile_picture.folder');

            $intent = $this->uploadIntentService->attach(
                $data->upload_intent_id,
                request()->user(),
                $user,
                'user',
            );

            $payload['profile_picture_storage_key'] = $data->profile_picture_storage_key;
            $payload['profile_picture_url'] = $this->mediaUrlService->profilePicture($data->profile_picture_storage_key);

            if ($oldStorageKey) {
                DeleteStorageAsset::dispatch($oldStorageKey, $oldFolder);
            }
        }

        $user->update($payload);

        // logs area ----------------------
        if ($user->wasChanged()) {
            $changes = $user->getChanges();

            unset(
                $changes['updated_at'],
                $changes['password'],
                $changes['profile_picture_storage_key'],
                $changes['profile_picture_url']
            );

            if (isset($payload['profile_picture_storage_key'])) {
                $changes['profile_picture'] = 'changed';
            }

            $oldValues = [];
            $newValues = [];

            foreach (array_keys($changes) as $field) {
                if ($field === 'profile_picture') {
                    $oldValues['profile_picture'] = $user['profile_picture_storage_key'] ? 'has_picture' : 'none';
                    $newValues['profile_picture'] = 'updated';
                    continue;
                }

                $oldValues[$field] = $user[$field] ?? null;
                $newValues[$field] = $user->{$field};
            }

            $details = [
                'message' => "Updated user profile details for {$user->username}",
                'old' => $oldValues,
                'new' => $newValues,
            ];
        } else {
            $details = [
                'message' => "Saved profile snapshot without modifications for user {$user->username}",
                'old' => [],
                'new' => [],
            ];
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Update User',
            'details' => $details,
        ]);
        // logs area ends here ----------------------

        return UserData::fromModel($user);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->profile_picture_storage_key) {
            $folder = config('uploads.purposes.profile_picture.folder');
            DeleteStorageAsset::dispatch($user->profile_picture_storage_key, $folder);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Delete User',
            'details' => [
                'message' => "Deleted user account: {$user->username}",
                'username' => $user->username,
                'email' => $user->email,
            ],
        ]);

        $user->delete();

        return response()->json(null, 204);
    }
}
