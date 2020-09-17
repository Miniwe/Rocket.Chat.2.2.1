import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import _ from 'underscore';

import { timeAgo } from '../helpers';
import { hasAllPermission } from '../../../../../authorization/client';
import { t, roomTypes } from '../../../../../utils';
import { settings } from '../../../../../settings';
import { hasAtLeastOnePermission } from '../../../../../authorization';
import { Users, ChatRoom } from '../../../../../models';
import './votesReport.html';
import './votesReport.css';

function messagesSearch(config, cb) {
	return Meteor.call('searchVotedMessages', config, (err, result) => {
		cb(result && result.results && result.results.length && result.results.map((result) => {
			const room = ChatRoom.findOne({_id: result.rid});
			return {
				// ...result,
				_id: result._id,
				rid: result.rid,
				room: (room && room.name) || result.rid,
				msg: result.msg,
				votersUp: result.votes.up,
				votersDown: result.votes.down,
				// users: result.usersCount || 0,
				date: timeAgo(result._updatedAt, t),
				// description: result.description,
				// archived: result.archived,
				// topic: result.topic,
			}
		}));
	});
}

Template.votesReport.helpers({
	searchResults() {
		return Template.instance().results.get();
	},
	searchType() {
		return Template.instance().searchType.get();
	},
	tabsData() {
		const {
			searchType,
			results,
			end,
			page,
		} = Template.instance();
		const upTab = {
			label: t('Up Votes'),
			value: 'up_votes',
			condition() {
				return true;
			},
		};
		const downTab = {
			label: t('Down Votes'),
			value: 'down_votes',
			condition() {
				return true;
			},
		};
		if (searchType.get() === 'up_votes') {
			upTab.active = true;
		} else {
			downTab.active = true;
		}
		return {
			tabs: [upTab, downTab],
			onChange(value) {
				results.set([]);
				end.set(false);
				page.set(0);
				searchType.set(value);
			},
		};
	},
	onTableItemClick() {
		const instance = Template.instance();

		const { searchType } = instance;

		let type;
		let routeConfig;

		console.log('onTableItemClick:', this, instance);
		return (item) => {
			console.log('aaa', item, this, instance);
		};
		// return function(item) {
		// 	if (searchType.get() === 'up_votes') {
		// 		type = 'c';
		// 		routeConfig = { name: item.name };
		// 	} else {
		// 		type = 'd';
		// 		routeConfig = { name: item.username };
		// 	}
		// 	roomTypes.openRouteLink(type, routeConfig);
		// };
	},
	isLoading() {
		return Template.instance().isLoading.get();
	},
	canViewOtherUserInfo() {
		const { canViewOtherUserInfo } = Template.instance();

		return canViewOtherUserInfo.get();
	},
	sumColumnCount(...args) {
		return args
			.slice(0, -1)
			.map((value) => (typeof value === 'number' ? value : Number(!!value)))
			.reduce((sum, value) => sum + value, 0);
	},
});

Template.votesReport.events({
	'click td.votesReport__voters li'(e, t) {
		e.preventDefault();
		e.stopPropagation();
		console.log('li click', e, t);
	}
});

Template.votesReport.onRendered(function() {
	function setResults(result) {
		if (!Array.isArray(result)) {
			result = [];
		}

		if (this.page.get() > 0) {
			return this.results.set([...this.results.get(), ...result]);
		}

		return this.results.set(result);
	}

	this.autorun(() => {
		const searchConfig = {
			type: this.searchType.get(),
			limit: this.limit.get(),
			page: this.page.get(),
		};

		if (this.end.get() || this.loading) {
			return;
		}

		this.loading = true;
		this.isLoading.set(true);

		messagesSearch(searchConfig, (result) => {
			this.loading = false;
			this.isLoading.set(false);
			this.end.set(!result);

			setResults.call(this, result);
		});
	});
});

Template.votesReport.onCreated(function() {
	const viewType = 'up_votes';
	this.searchType = new ReactiveVar(viewType);

	this.limit = new ReactiveVar(0);
	this.page = new ReactiveVar(0);
	this.end = new ReactiveVar(false);

	this.results = new ReactiveVar([]);

	this.isLoading = new ReactiveVar(false);

	this.canViewOtherUserInfo = new ReactiveVar(false);

	this.autorun(() => {
		this.canViewOtherUserInfo.set(hasAllPermission('view-full-other-user-info'));
	});
});
