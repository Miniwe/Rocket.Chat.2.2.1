import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';

import { timeAgo } from '../helpers';
import { hasAllPermission } from '../../../../../authorization/client';
import { t, roomTypes } from '../../../../../utils';
import { Subscriptions, ChatRoom } from '../../../../../models';
import './votesReport.html';
import './votesReport.css';

function messagesSearch(config, cb) {
	return Meteor.call('searchVotedMessages', config, (err, result) => {
		cb(
			result &&
				result.results &&
				result.results.length &&
				result.results.map((result) => {
					const room = ChatRoom.findOne({ _id: result.rid });
					return {
						_id: result._id,
						rid: result.rid,
						room: (room && room.name) || result.rid,
						msg: result.msg,
						votersUp: result.votes && result.votes.up,
						votersDown: result.votes && result.votes.down,
						date: timeAgo(result._updatedAt, t),
					};
				})
		);
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
		const { searchType, results, end, page } = Template.instance();
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
	'click a[data-msg]'(e) {
		e.preventDefault();
		e.stopPropagation();
		const { rid, _id } = Blaze.getData(e.currentTarget);
		const room = Subscriptions.findOne({ rid });
		roomTypes.openRouteLink(room.t, { name: room.name }, { msg: _id });
	},
	'click a[data-user]'(e) {
		e.preventDefault();
		e.stopPropagation();
		const { user } = e.currentTarget.dataset;
		roomTypes.openRouteLink('d', { name: user });
	},
	'click a[data-rid]'(e) {
		e.preventDefault();
		e.stopPropagation();
		const { rid } = Blaze.getData(e.currentTarget);
		const room = Subscriptions.findOne({ rid });
		roomTypes.openRouteLink(room.t, { name: room.name });
	},
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
		this.canViewOtherUserInfo.set(
			hasAllPermission('view-full-other-user-info')
		);
	});
});
