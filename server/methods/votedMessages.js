import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import s from 'underscore.string';

import { hasPermission } from '../../app/authorization';
import { Messages, Rooms, Users } from '../../app/models';
import { settings } from '../../app/settings/server';
import { getFederationDomain } from '../../app/federation/server/lib/getFederationDomain';
import { isFederationEnabled } from '../../app/federation/server/lib/isFederationEnabled';
import { federationSearchUsers } from '../../app/federation/server/handler';


Meteor.methods({
	searchVotedMessages({ type = 'up_votes', page, offset, limit = 10 }) {

		if (!['up_votes', 'down_votes'].includes(type)) {
			return;
		}

		if ((!page && page !== 0) && (!offset && offset !== 0)) {
			return;
		}
		const skip = Math.max(0, offset || (page > -1 ? limit * page : 0));

		limit = limit > 0 ? limit : 10;

		const pagination = {
			skip,
			limit,
		};

		const user = Meteor.user();

		// non-logged id user
		if (!user) {
			return;
		}

		// type === users
		if (!hasPermission(user._id, 'view-outside-room') || !hasPermission(user._id, 'view-d-room')) {
			return;
		}


		if (type === 'up_votes' || type === 'down_votes') {
			console.log('type', type);
		}

		const result = Messages.findByVotes({}, {
			...pagination,
			// sort,
			// fields: {
			// 	description: 1,
			// 	topic: 1,
			// 	name: 1,
			// 	lastMessage: 1,
			// 	ts: 1,
			// 	archived: 1,
			// 	usersCount: 1,
			// },
		});

		return {
			total: result.count(), // count ignores the `skip` and `limit` options
			results: result.fetch(),
		};
	}
});

DDPRateLimiter.addRule({
	type: 'method',
	name: 'searchVotedMessages',
	userId(/* userId*/) {
		return true;
	},
}, 100, 100000);
