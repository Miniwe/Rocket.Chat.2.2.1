import { Meteor } from 'meteor/meteor';
import { Blaze } from 'meteor/blaze';
import { Template } from 'meteor/templating';

import { Rooms } from '../../models';
import { messageArgs } from '../../ui-utils/client/lib/messageArgs';

Template.room.events({
	'click li[data-vote]'(event) {
		event.preventDefault();
		event.stopPropagation();

		const vote = event.currentTarget.getAttribute('data-vote');
		const data = Blaze.getData(event.currentTarget);
		const { msg: { rid, _id: mid } } = messageArgs(data);
		const user = Meteor.user();
		const room = Rooms.findOne({ _id: rid });


		if (room.ro && !room.reactWhenReadOnly) {
			if (!Array.isArray(room.unmuted) || room.unmuted.indexOf(user.username) === -1) {
				return false;
			}
		}

		if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1) {
			return false;
		}

		Meteor.call('setVotes', mid, vote);
	},
});
