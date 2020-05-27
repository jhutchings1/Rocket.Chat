import { Messages, Subscriptions, Rooms } from '../../../models';
import { callbacks } from '../../../callbacks';
import { FileUpload } from '../../../file-upload/server';

export const deleteRoom = function(rid) {
	console.log('function deleteRoom rid', rid);
	FileUpload.removeFilesByRoomId(rid);
	Messages.removeByRoomId(rid);
	callbacks.run('beforeDeleteRoom', rid);
	Subscriptions.removeByRoomId(rid);
	callbacks.run('afterDeleteRoom', rid);
	return Rooms.removeById(rid);
};
