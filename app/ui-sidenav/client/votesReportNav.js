import { Template } from 'meteor/templating';

import { hasPermission } from '../../authorization/client';
import './votesReportNav.html';

Template.votesReportNav.helpers({
	votesReportAccess() {
		return hasPermission('access-most-voted')
	},
});
