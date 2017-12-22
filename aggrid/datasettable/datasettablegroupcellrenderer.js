function DatasetTableGroupCellRenderer() {
    agGrid.GroupCellRenderer.call(this);
}
  
DatasetTableGroupCellRenderer.prototype = Object.create(agGrid.GroupCellRenderer.prototype);
DatasetTableGroupCellRenderer.prototype.constructor = DatasetTableGroupCellRenderer;
  

DatasetTableGroupCellRenderer.prototype.updateChildCount = function() {
    var allChildrenCount = this.displayedGroup.allChildrenCount;
    this.eChildCount.innerHTML = allChildrenCount >= 0 ? allChildrenCount : "";
}