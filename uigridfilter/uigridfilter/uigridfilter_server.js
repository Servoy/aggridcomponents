$scope.api.init = function(formFoundset, databaseManagerForm){
	//get all column names from the foundset
	var columns = formFoundset.alldataproviders;
	var colDefs = [];
	var colDef = {};
	//var cellWidth = 100/columns.length + "%";
	  for(var i=0; i<columns.length; i++){
		 colDef = {name: ""+columns[i]+"", headerCellClass: $scope.highlightFilteredHeader, width:200};
		 colDefs.push(colDef);
	  }
	//define the data array
	var rowData = [];
	
	console.log("before data processing");
	console.log(databaseManagerForm.getFoundSetCount(formFoundset));
	//build the dataset as a json array in the form: 
	//rowData = [{"col1Name":"col1ValueRow1", "col2Name":"col2ValueRow1",...}, {"col1Name":"col1ValueRow2", "col2Name":"col2ValueRow2",...},...]
	for(var j=1; j<=databaseManagerForm.getFoundSetCount(formFoundset);j++){
		var objRow = {};
		for(var i=0; i<columns.length; i++){
			var record = formFoundset.getRecord(j);
			objRow[columns[i]] = record[columns[i]];
		}
		rowData.push(objRow);
	}
	console.log("after data processing");

	$scope.model.jsonHeaders = colDefs;
	$scope.model.jsonData = rowData;

}