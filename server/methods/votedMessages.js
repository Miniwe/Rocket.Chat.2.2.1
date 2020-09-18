import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import s from 'underscore.string';

import { hasPermission } from '../../app/authorization';
import { Messages } from '../../app/models';

Meteor.methods({
	searchVotedMessages({ type = 'up_votes', page, offset, limit = 10 }) {
		if (!['up_votes', 'down_votes'].includes(type)) {
			return;
		}

		if (!page && page !== 0 && !offset && offset !== 0) {
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
		if (
			!hasPermission(user._id, 'view-outside-room') ||
			!hasPermission(user._id, 'view-d-room')
		) {
			return;
		}

		const result = Messages.findByVotes(
			{ type: type.slice(0, type.indexOf('_')) },
			{
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
			}
		);

		return {
			total: result.count(), // count ignores the `skip` and `limit` options
			results: result.fetch(),
		};
	},
});

DDPRateLimiter.addRule(
	{
		type: 'method',
		name: 'searchVotedMessages',
		userId(/* userId*/) {
			return true;
		},
	},
	100,
	100000
);
