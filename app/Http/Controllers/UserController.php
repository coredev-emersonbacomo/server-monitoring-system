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

        return UserData::fromModel($user)->toResponse(request())->setStatusCode(201);
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
        if(!($data->phone_number instanceof \Spatie\LaravelData\Optional)) {
            $payload['contact_number'] = $data->phone_number;
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

        return UserData::fromModel($user);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->profile_picture_storage_key) {
            $folder = config('uploads.purposes.profile_picture.folder');
            DeleteStorageAsset::dispatch($user->profile_picture_storage_key, $folder);
        }

        $user->delete();
        return response()->json(null, 204);
    }
}
