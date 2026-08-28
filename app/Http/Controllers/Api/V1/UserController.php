<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\AddClientData;
use App\Data\ClientData;
use App\Data\CreateUserData;
use App\Data\UpdateUserData;
use App\Data\UserData;
use App\Data\UsersIndexData;
use App\Http\Controllers\Controller;
use App\Jobs\DeleteStorageAsset;
use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\MediaUrlService;
use App\Services\UploadIntentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\LaravelData\Optional;

class UserController extends Controller
{
    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
        private readonly MediaUrlService $mediaUrlService,
    ) {}

    public function index(UsersIndexData $data)
    {
        $query = User::query();

        if ($data->q) {
            $term = '%'.strtolower(trim($data->q)).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(first_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(username) LIKE ?', [$term]);
            });
        }

        if ($data->exclude_user_uuid) {
            $uuids = array_filter(explode(',', $data->exclude_user_uuid));
            $query->whereNotIn('uuid', $uuids);
        }

        // Filter
        switch ($data->filter) {
            case 'archived':
                $query->whereIn('record_status', ['archived', 'deleted']);
                break;
            case 'deleted':
                $query->where('record_status', 'deleted');
                break;
            case 'active':
                $query->where('record_status', 'active');
                break;
            case 'all':
            default:
                $query->where('record_status', '!=', 'archived')
                    ->where('record_status', '!=', 'deleted');
                break;
        }

        $sort = $data->sort ?? 'created_at';
        $dir = $data->dir ?? 'desc';
        $allowedSorts = ['created_at', 'name', 'email', 'username'];
        if ($sort === 'name') {
            $query->orderBy('first_name', $dir)->orderBy('last_name', $dir);
        } elseif (in_array($sort, $allowedSorts, true)) {
            $query->orderBy($sort, $dir);
        } else {
            $query->orderBy('created_at', $dir);
        }

        return $query
            ->paginate(perPage: $data->per_page, page: $data->page)
            ->through(fn (User $u) => UserData::fromModel($u))
            ->toArray();
    }

    public function store(CreateUserData $data)
    {
        $payload = [
            'first_name' => $data->first_name,
            'last_name' => $data->last_name,
            'email' => $data->email,
            'phone_number' => $data->phone_number,
            'username' => $data->username,
            'password' => Hash::make($data->password),
        ];

        if ($data->timezone !== null) {
            $payload['timezone'] = $data->timezone;
        }

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

        if (! ($data->first_name instanceof Optional)) {
            $payload['first_name'] = $data->first_name;
        }
        if (! ($data->last_name instanceof Optional)) {
            $payload['last_name'] = $data->last_name;
        }
        if (! ($data->email instanceof Optional)) {
            $payload['email'] = $data->email;
        }
        if (! ($data->phone_number instanceof Optional)) {
            $payload['phone_number'] = $data->phone_number;
        }
        if (! ($data->username instanceof Optional)) {
            $payload['username'] = $data->username;
        }
        if (! ($data->timezone instanceof Optional)) {
            $payload['timezone'] = $data->timezone;
        }
        if (! ($data->password instanceof Optional) && $data->password !== null) {
            $payload['password'] = Hash::make($data->password);
        }

        if (! ($data->upload_intent_id instanceof Optional) && $data->upload_intent_id !== null) {
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

    /** @return ClientData[] */
    public function clients(string $userUuid): array
    {
        $user = User::where('uuid', $userUuid)->firstOrFail();
        $clients = $user->clients()->withCount('servers')->get();

        return ClientData::collect($clients->map(fn (Client $client) => ClientData::fromModel($client)))->toArray();
    }

    public function addClient(AddClientData $data, string $userUuid): JsonResponse
    {
        $user = User::where('uuid', $userUuid)->firstOrFail();
        $client = Client::where('uuid', $data->client_uuid)->firstOrFail();

        if ($user->clients()->where('client_id', $client->id)->exists()) {
            return response()->json(['error' => 'Client already assigned to this user'], 409);
        }

        $limit = (int) Setting::get('secop_limit_per_client', 2);
        if ($client->secopclients()->count() >= $limit) {
            return response()->json([
                'message' => "The client has reached the maximum limit of {$limit} SecOps.",
                'errors' => [
                    'client_uuid' => ["The client has reached the maximum limit of {$limit} SecOps."],
                ],
            ], 422);
        }

        $user->clients()->attach($client->id, [
            'uuid' => Str::uuid()->toString(),
            'record_status' => 'active',
        ]);

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Assign Client',
            'details' => [
                'message' => "Assigned client {$client->name} to user {$user->username}",
                'client_name' => $client->name,
                'user_id' => $user->id,
                'username' => $user->username,
            ],
        ]);

        return response()->json(['message' => 'Client added successfully'], 201);
    }

    public function removeClient(string $userUuid, string $clientUuid): JsonResponse
    {
        $user = User::where('uuid', $userUuid)->firstOrFail();
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        if (! $user->clients()->where('client_id', $client->id)->exists()) {
            return response()->json(['error' => 'Client not assigned to this user'], 404);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Remove Client',
            'details' => [
                'message' => "Removed client {$client->name} from user {$user->username}",
                'client_name' => $client->name,
                'user_id' => $user->id,
                'username' => $user->username,
            ],
        ]);

        $user->clients()->detach($client->id);

        return response()->json(null, 204);
    }
}
