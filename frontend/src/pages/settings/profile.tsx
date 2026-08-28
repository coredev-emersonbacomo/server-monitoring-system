import { Loader2, ShieldCheck } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Form } from "@/components/ui/form";
import { useProfile } from "./profile/hooks/useProfile";
import { ProfileHeader } from "./profile/components/ProfileHeader";
import { BasicInformationSection } from "./profile/components/BasicInformationSection";
import { TimezoneSection } from "./profile/components/TimezoneSection";
import { PasswordSection } from "./profile/components/PasswordSection";

export const Profile: React.FC = () => {
    const {
        user,
        isLoading,
        navigate,
        store,
        mode,
        form,
        fullName,
        email,
        username,
        phone_number,
        avatarSrc,
        handleAvatarChange,
        handleFormSubmit,
    } = useProfile();

    if (isLoading) {
        return (
            <PageLayout>
                <div className="flex items-center justify-center min-h-[60vh] gap-3">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground text-sm">
                        Loading profile...
                    </p>
                </div>
            </PageLayout>
        );
    }

    if (!user) {
        return (
            <PageLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
                    <div className="bg-muted p-3 rounded-full">
                        <ShieldCheck
                            size={28}
                            className="text-muted-foreground"
                        />
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Please log in to view your profile.
                    </p>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <Form.Root
                store={store}
                className="w-full flex-1 flex flex-col min-h-0"
            >
                <ProfileHeader
                    mode={mode}
                    user={user}
                    form={form}
                    store={store}
                    fullName={fullName}
                    avatarSrc={avatarSrc}
                    onNavigateBack={() => navigate("/settings")}
                    onAvatarChange={handleAvatarChange}
                />

                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6">
                        <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8">
                            <Form.SubmitHandler handler={handleFormSubmit} />

                            <BasicInformationSection
                                mode={mode}
                                form={form}
                                store={store}
                                email={email}
                                username={username}
                                phone_number={phone_number}
                            />

                            <div className="h-px bg-border" />

                            <TimezoneSection
                                mode={mode}
                                form={form}
                                store={store}
                                timezone={user.timezone}
                            />

                            {mode !== "view" && (
                                <>
                                    <div className="h-px bg-border" />
                                    <PasswordSection form={form} store={store} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Form.Root>
        </PageLayout>
    );
};

export default Profile;
