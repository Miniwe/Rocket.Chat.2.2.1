/* eslint no-multi-spaces: 0 */
import { Meteor } from 'meteor/meteor';

import { Roles, Permissions } from '../../models';

Meteor.startup(function() {
	const permissions = [
		{ _id: 'access-most-voted', roles: ['admin', 'ebadmin'] },
	];
	for (const permission of permissions) {
		if (!Permissions.findOneById(permission._id)) {
			Permissions.upsert(permission._id, { $set: permission });
		}
	}
	const defaultRoles = [
		{ name: 'ebadmin', scope: 'Users', description: 'EBAdmin' },
	];
	for (const role of defaultRoles) {
		Roles.upsert({ _id: role.name }, { $setOnInsert: { scope: role.scope, description: role.description || '', protected: true, mandatory2fa: false } });
	}
});
