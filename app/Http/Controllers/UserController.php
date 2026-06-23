<?php

namespace App\Http\Controllers;

use App\Data\UpdateUserData;
use App\Data\CreateUserData;
use App\Models\User;
use App\Services\ImageReplacementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Data\UserData;

class UserController extends Controller
{
    public function __construct(
        private readonly ImageReplacementService $imageReplacement,
    ) {}

    public function index()
    {
        $users = User::with('role')->get();

        return $users->map(fn(User $u) => UserData::fromModel($u));
    }

    public function store(CreateUserData $data)
    {
        $user = User::create([
            'first_name' => $data->first_name,
            'last_name'  => $data->last_name,
            'email'      => $data->email,
            'contact_number' => $data->contact_number,
            'username'   => $data->username,
            'role_id'    => $data->role_id,
            'password'   => Hash::make($data->password),
            'profile_picture_url' => $data->cloudinary_url ?? '',
            'profile_picture_public_id' => $data->cloudinary_public_id ?? null,
        ]);

        return UserData::fromModel($user->load('role'))->toResponse(request())->setStatusCode(201);
    }

    public function show(User $user): UserData
    {
        return UserData::fromModel($user->load('role'));
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
        if(!($data->contact_number instanceof \Spatie\LaravelData\Optional)) {
            $payload['contact_number'] = $data->contact_number;
        }
        if (!($data->username instanceof \Spatie\LaravelData\Optional)) {
            $payload['username'] = $data->username;
        }
        if (!($data->role_id instanceof \Spatie\LaravelData\Optional)) {
            $payload['role_id'] = $data->role_id;
        }
        if (!($data->password instanceof \Spatie\LaravelData\Optional) && $data->password !== null) {
            $payload['password'] = Hash::make($data->password);
        }

        if (!($data->cloudinary_url instanceof \Spatie\LaravelData\Optional) && $data->cloudinary_url !== null) {
            $this->imageReplacement->handleReplacement(
                newUrl: $data->cloudinary_url,
                newPublicId: $data->cloudinary_public_id,
                existingUrl: $user->profile_picture_url,
                existingPublicId: $user->profile_picture_public_id,
            );

            $payload['profile_picture_url'] = $data->cloudinary_url;
            $payload['profile_picture_public_id'] = $data->cloudinary_public_id ?? null;
        }

        $user->update($payload);

        return UserData::fromModel($user->load('role'));
    }

    public function destroy(User $user): JsonResponse
    {
        $this->imageReplacement->handleDeletion(
            url: $user->profile_picture_url,
            publicId: $user->profile_picture_public_id,
        );

        $user->delete();

        return response()->json(null, 204);
    }
}
