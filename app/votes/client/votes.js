import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './votes.html';

Template.votes.helpers({
	upSelected() {
		const { votes = {} } = this;
		const isSelected = votes.up
			&& votes.up.indexOf(Meteor.user().username) > -1;
		return isSelected && 'selected';
	},
	upCount() {
		const { votes = {} } = this;
		return votes.up && votes.up.length;
	},
	downSelected() {
		const { votes = {} } = this;
		const isSelected = votes.down
			&& votes.down.indexOf(Meteor.user().username) > -1;
		return isSelected && 'selected';
	},
	downCount() {
		const { votes = {} } = this;
		return votes.down && votes.down.length;
	},
});
