"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const PlayerService_1 = __importDefault(require("./PlayerService"));
const INVITATION_TIMEOUT = 30000; // 30 seconds
class InvitationService {
    constructor() {
        this.invitations = new Map();
        this.timeouts = new Map();
    }
    createInvitation(from, to) {
        const invitationId = (0, uuid_1.v4)();
        const invitation = {
            id: invitationId,
            from,
            to,
            status: "pending",
            createdAt: Date.now(),
        };
        this.invitations.set(invitationId, invitation);
        // Update player statuses
        PlayerService_1.default.updatePlayerStatus(from.id, "invited");
        PlayerService_1.default.updatePlayerStatus(to.id, "invited");
        // Set timeout for invitation expiration
        const timeout = setTimeout(() => {
            this.expireInvitation(invitationId);
        }, INVITATION_TIMEOUT);
        this.timeouts.set(invitationId, timeout);
        return invitation;
    }
    getInvitation(invitationId) {
        return this.invitations.get(invitationId);
    }
    acceptInvitation(invitationId) {
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
    declineInvitation(invitationId) {
        const invitation = this.invitations.get(invitationId);
        if (!invitation || invitation.status !== "pending") {
            return null;
        }
        invitation.status = "declined";
        // Update player statuses back to available
        PlayerService_1.default.updatePlayerStatus(invitation.from.id, "available");
        PlayerService_1.default.updatePlayerStatus(invitation.to.id, "available");
        // Clear timeout
        const timeout = this.timeouts.get(invitationId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(invitationId);
        }
        return invitation;
    }
    expireInvitation(invitationId) {
        const invitation = this.invitations.get(invitationId);
        if (!invitation || invitation.status !== "pending") {
            return;
        }
        invitation.status = "expired";
        // Update player statuses back to available
        PlayerService_1.default.updatePlayerStatus(invitation.from.id, "available");
        PlayerService_1.default.updatePlayerStatus(invitation.to.id, "available");
        this.timeouts.delete(invitationId);
    }
    getInvitationsForPlayer(playerId) {
        return Array.from(this.invitations.values()).filter((invitation) => invitation.to.id === playerId && invitation.status === "pending");
    }
    removeInvitation(invitationId) {
        const timeout = this.timeouts.get(invitationId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(invitationId);
        }
        return this.invitations.delete(invitationId);
    }
}
exports.default = new InvitationService();
//# sourceMappingURL=InvitationService.js.map