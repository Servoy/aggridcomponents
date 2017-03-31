/**
 * @properties={typeid:24,uuid:"FF75E45C-3EDE-4520-9631-17AB8A33E638"}
 */
function populateOrder() {
	var fs = datasources.db.example_data.orders.getFoundSet();
	fs.loadAllRecords()
	fs.getRecord(databaseManager.getFoundSetCount(fs))
	
	for (var i = 1; i <= fs.getSize() || 1 < 10000; i++) {
		var record = fs.getRecord(i);
		var newRec = fs.getRecord(fs.newRecord(false,false));
		if (newRec) {
			databaseManager.copyMatchingFields(record,newRec);
			
			for (var j = 1; j <= record.orders_to_order_details.getSize(); j++) {
				var orderline = record.orders_to_order_details.getRecord(j);
				var newOrderline = newRec.orders_to_order_details.getRecord(newRec.orders_to_order_details.newRecord(false,false))
				if (newOrderline) {
					databaseManager.copyMatchingFields(orderline,newOrderline);
				}
			}
			
		}
		databaseManager.saveData()
	}
}