import { Invitation, Player } from "../types/game.types";
declare class InvitationService {
    private invitations;
    private timeouts;
    createInvitation(from: Player, to: Player): Invitation;
    getInvitation(invitationId: string): Invitation | undefined;
    acceptInvitation(invitationId: string): Invitation | null;
    declineInvitation(invitationId: string): Invitation | null;
    private expireInvitation;
    getInvitationsForPlayer(playerId: string): Invitation[];
    removeInvitation(invitationId: string): boolean;
}
declare const _default: InvitationService;
export default _default;
