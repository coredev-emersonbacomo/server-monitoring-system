<?php

namespace App\Http\Controllers;

use App\Data\FullUserData;
use App\Data\UpdateUserData;
use App\Data\CreateUserData;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

// UserController
class UserController extends Controller
{
    /**
     * @return \Spatie\LaravelData\DataCollection<\App\Data\FullUserData>
     */
    public function index()
    {
        $users = User::with('role')->get();

        return FullUserData::collect($users);
    }

    /**
     * @return \App\Data\FullUserData
     */
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
        ]);

        return FullUserData::from($user->load('role'))->toResponse(request())->setStatusCode(201);
    }

    /**
     * @return \App\Data\FullUserData
     */
    public function show(User $user): FullUserData
    {
        return FullUserData::from($user->load('role'));
    }

    /**
     * @return \App\Data\FullUserData
     */
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

        $user->update($payload);

        return FullUserData::from($user->load('role'));
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(null, 204);
    }
}
