import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { deleteRoom } from './deleteRoom';
import { FileUpload } from '../../../file-upload';
import { Messages, Rooms, RoomEvents } from '../../../models';
import { Notifications } from '../../../notifications';

export const cleanRoomHistory = async function({ rid, latest = new Date(), oldest = new Date('0001-01-01T00:00:00Z'), inclusive = true, limit = 0, excludePinned = true, ignoreDiscussion = true, filesOnly = false, fromUsers = [] }) {
	const gt = inclusive ? '$gte' : '$gt';
	const lt = inclusive ? '$lte' : '$lt';

	const ts = { [gt]: oldest, [lt]: latest };

	const text = `_${ TAPi18n.__('File_removed_by_prune') }_`;

	let fileCount = 0;
	Messages.findFilesByRoomIdPinnedTimestampAndUsers(
		rid,
		excludePinned,
		ignoreDiscussion,
		ts,
		fromUsers,
		{ fields: { 'file._id': 1, pinned: 1 }, limit },
	).forEach((document) => {
		console.log('function cleanRoomHistory document', typeof document, document);
		FileUpload.getStore('Uploads').deleteById(document._id);
		fileCount++;
		if (filesOnly) {
			Messages.update({ _id: document._id }, { $unset: { file: 1 }, $set: { attachments: [{ color: '#FD745E', text }] } });
		}
	});
	if (filesOnly) {
		return fileCount;
	}

	if (!ignoreDiscussion) {
		Messages.findDiscussionByRoomIdPinnedTimestampAndUsers(rid, excludePinned, ts, fromUsers, { fields: { drid: 1 }, ...limit && { limit } }).fetch()
			.forEach((payload) => {
				const { drid } = payload;
				deleteRoom(drid);
			});
	}

	const result = await RoomEvents.createPruneMessagesEvent(rid);

	// clean up this and its method at Messages model since it's not used anymore
	// const count = Messages.removeByIdPinnedTimestampLimitAndUsers(rid, excludePinned, ignoreDiscussion, ts, limit, fromUsers);
	if (result.count) {
		Rooms.resetLastMessageById(rid);
		Notifications.notifyRoom(rid, 'deleteMessageBulk', {
			rid,
			excludePinned,
			ignoreDiscussion,
			ts,
			users: fromUsers,
		});
	}
	return result.count;
};
