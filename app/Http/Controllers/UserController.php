<?php

namespace App\Http\Controllers;

use App\Data\CreateUserData;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
//  UserController 
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('role')->get();

        return response()->json($users);
    }

    public function store(CreateUserData $data): JsonResponse
    {
        $user = User::create([
            'first_name' => $data->first_name,
            'last_name'  => $data->last_name,
            'email'      => $data->email,
            'username'   => $data->username,
            'role_id'    => $data->role_id,
            'password'   => Hash::make($data->password),
        ]);

        return response()->json($user->load('role'), 201);
    }
    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('role'));
    }
}
