<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $verifyUrl,
        public string $userEmail,
        public int $expiresInMinutes = 60,
        public ?string $logoPath = null,
    ) {
        $this->logoPath = $this->logoPath ?? public_path('images/coreDevlogo.png');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'CoreDev Server Monitoring - Verify Your Email',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-verification',
            with: [
                'appName' => 'CoreDev Server Monitoring',
                'verifyUrl' => $this->verifyUrl,
                'userEmail' => $this->userEmail,
                'expiresInMinutes' => $this->expiresInMinutes,
                'logoPath' => $this->logoPath,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
