import { v4 as uuidv4 } from "uuid";
import { Invitation, Player, InvitationStatus } from "../types/game.types";
import PlayerService from "./PlayerService";

const INVITATION_TIMEOUT = 30000; // 30 seconds

class InvitationService {
  private invitations: Map<string, Invitation> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  createInvitation(from: Player, to: Player): Invitation {
    const invitationId = uuidv4();
    const invitation: Invitation = {
      id: invitationId,
      from,
      to,
      status: "pending",
      createdAt: Date.now(),
    };
    this.invitations.set(invitationId, invitation);

    // Update player statuses
    PlayerService.updatePlayerStatus(from.id, "invited");
    PlayerService.updatePlayerStatus(to.id, "invited");

    // Set timeout for invitation expiration
    const timeout = setTimeout(() => {
      this.expireInvitation(invitationId);
    }, INVITATION_TIMEOUT);
    this.timeouts.set(invitationId, timeout);

    return invitation;
  }

  getInvitation(invitationId: string): Invitation | undefined {
    return this.invitations.get(invitationId);
  }

  acceptInvitation(invitationId: string): Invitation | null {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.status !== "pending") {
      return null;
    }

    invitation.status = "accepted";

    // Clear timeout
    const timeout = this.timeouts.get(invitationId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(invitationId);
    }

    return invitation;
  }

  declineInvitation(invitationId: string): Invitation | null {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.status !== "pending") {
      return null;
    }

    invitation.status = "declined";

    // Update player statuses back to available
    PlayerService.updatePlayerStatus(invitation.from.id, "available");
    PlayerService.updatePlayerStatus(invitation.to.id, "available");

    // Clear timeout
    const timeout = this.timeouts.get(invitationId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(invitationId);
    }

    return invitation;
  }

  private expireInvitation(invitationId: string): void {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.status !== "pending") {
      return;
    }

    invitation.status = "expired";

    // Update player statuses back to available
    PlayerService.updatePlayerStatus(invitation.from.id, "available");
    PlayerService.updatePlayerStatus(invitation.to.id, "available");

    this.timeouts.delete(invitationId);
  }

  getInvitationsForPlayer(playerId: string): Invitation[] {
    return Array.from(this.invitations.values()).filter(
      (invitation) =>
        invitation.to.id === playerId && invitation.status === "pending"
    );
  }

  removeInvitation(invitationId: string): boolean {
    const timeout = this.timeouts.get(invitationId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(invitationId);
    }
    return this.invitations.delete(invitationId);
  }
}

export default new InvitationService();

