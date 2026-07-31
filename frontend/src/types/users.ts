export interface UsersStorePayload {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    phone_number: string;
    password: string;
    password_confirmation: string;
    upload_intent_id?: string;
    profile_picture_storage_key?: string;
}

export interface UsersUpdatePayload {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    phone_number: string;
    password?: string | null;
    password_confirmation?: string | null;
    upload_intent_id?: string;
    profile_picture_storage_key?: string;
}
