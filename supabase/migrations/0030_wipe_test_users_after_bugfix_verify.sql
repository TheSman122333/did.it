-- cleans up the handful of throwaway accounts created while reproducing
-- and verifying the revalidatePath-during-render crash in sendFriendRequest.
delete from auth.users;
