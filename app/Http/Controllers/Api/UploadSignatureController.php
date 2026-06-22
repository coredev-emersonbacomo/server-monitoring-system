<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadSignatureRequest;
use App\Services\CloudinaryService;
use App\Data\UploadSignatureData;

class UploadSignatureController extends Controller
{
    public function __construct(
        private readonly CloudinaryService $cloudinary,
    ) {}

    public function profilePicture(UploadSignatureRequest $request): UploadSignatureData
    {
        $folder = $request->input('folder', 'profile_pictures');

        $signature = $this->cloudinary->generateSignature($folder);

        return UploadSignatureData::from($signature);
    }

    public function clientBanner(UploadSignatureRequest $request): UploadSignatureData
    {
        $folder = $request->input('folder', 'client_banner_images');

        $signature = $this->cloudinary->generateSignature($folder);

        return UploadSignatureData::from($signature);
    }
}
