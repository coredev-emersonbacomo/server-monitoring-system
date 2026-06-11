<?php

use App\Models\Coop;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Fetch all coops so the dropdown can show them
    $coops = Coop::all(); 
    
    return view('welcome', compact('coops'));
});
