$scope.api.newColumn = function(id, index) {
    if(!$scope.model.columns) {
        $scope.model.columns = [];
    }
    var newColumn = {}
    newColumn["id"] = id;
    newColumn["pivotIndex"] = -1;
    newColumn["rowGroupIndex"] = -1;
    newColumn["visible"] = true;
    newColumn["width"] = 0;

    $scope.model.columns.splice(index, 0, newColumn);
    return $scope.model.columns[index];
}

$scope.api.deleteColumn = function(id) {
    if($scope.model.columns) {
        for(var i = 0; i < $scope.model.columns.length; i++) {
            if(id == $scope.model.columns[i]["id"]) {
                $scope.model.columns.splice(i, 1);
                break;
            }
        }
    }
}

$scope.api.getAllColumns = function() {
    return $scope.model.columns;
}

$scope.api.getColumn = function(id) {
    if($scope.model.columns) {
        for(var i = 0; i < $scope.model.columns.length; i++) {
            if(id == $scope.model.columns[i]["id"]) {
                return $scope.model.columns[i];
            }
        }
    }
    return null;
}