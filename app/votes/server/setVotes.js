import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';
import _ from 'underscore';

import { Messages, Subscriptions, Rooms } from '../../models';
import { Notifications } from '../../notifications';
import { callbacks } from '../../callbacks';
import { isTheLastMessage, msgStream } from '../../lib';

const removeUserVotes = (message, username, vote) => {
	const oVote = vote === 'up' ? 'down' : 'up';

	if (message.votes[vote].indexOf(username) > -1) {
		message.votes[vote].splice(message.votes[vote].indexOf(username), 1);
	} else if (message.votes[oVote].indexOf(username) > -1) {
		message.votes[oVote].splice(message.votes[oVote].indexOf(username), 1);
		message.votes[vote].push(username);
	}

	if (message.votes[vote].length === 0) {
		delete message.votes[vote];
	}
	if (message.votes[oVote].length === 0) {
		delete message.votes[oVote];
	}

	return message;
};

export function setVotes(room, user, message, vote, shouldVote) {
	if (room.ro && !room.reactWhenReadOnly) {
		if (!Array.isArray(room.unmuted)
			|| room.unmuted.indexOf(user.username) === -1) {
			return false;
		}
	}

	if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1) {
		Notifications.notifyUser(Meteor.userId(), 'message', {
			_id: Random.id(),
			rid: room._id,
			ts: new Date(),
			msg: TAPi18n.__('You_have_been_muted', {}, user.language),
		});
		return false;
	}
	if (!Subscriptions.findOne({ rid: message.rid })) {
		return false;
	}

	if (!message.votes) {
		message.votes = {};
	}
	if (!message.votes.up) {
		message.votes.up = [];
	}
	if (!message.votes.down) {
		message.votes.down = [];
	}

	const userAlreadyVoted = (message.votes.up.indexOf(user.username) > -1)
		|| (message.votes.down.indexOf(user.username) > -1);

	// When shouldVote was not informed, toggle the vote.
	if (shouldVote === undefined) {
		shouldVote = !userAlreadyVoted;
	}

	if (userAlreadyVoted === shouldVote) {
		return;
	}

	if (userAlreadyVoted) {
		removeUserVotes(message, user.username, vote);
		if (_.isEmpty(message.votes)) {
			delete message.votes;
			if (isTheLastMessage(room, message)) {
				Rooms.unsetVotesInLastMessage(room._id);
			}
			Messages.unsetVotes(message._id);
		} else {
			Messages.setVotes(message._id, message.votes);
			if (isTheLastMessage(room, message)) {
				Rooms.setVotesInLastMessage(room._id, message);
			}
		}
		callbacks.run('unsetVotes', message._id, vote);
		callbacks.run('afterUnsetVotes', message, { user, vote, shouldVote });
	} else {
		message.votes[vote].push(user.username);
		Messages.setVotes(message._id, message.votes);
		if (isTheLastMessage(room, message)) {
			Rooms.setVotesInLastMessage(room._id, message);
		}
		callbacks.run('setVotes', message._id, vote);
		callbacks.run('afterSetVotes', message, { user, vote, shouldVote });
	}

	msgStream.emit(message.rid, message);
}

Meteor.methods({
	setVotes(messageId, vote) {
		const user = Meteor.user();

		const message = Messages.findOneById(messageId);
		const room = Meteor.call('canAccessRoom', message.rid, Meteor.userId());

		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'setVotes',
			});
		}

		if (!message) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'setReaction',
			});
		}

		if (!room) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'setReaction',
			});
		}

		return setVotes(room, user, message, vote);
	},
});
