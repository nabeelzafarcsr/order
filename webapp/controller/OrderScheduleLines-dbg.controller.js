sap.ui.define([
	"com/csr/order/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"com/csr/order/model/formatter"
], function(BaseController, JSONModel, History, formatter) {
	"use strict";

	return BaseController.extend("com.csr.order.controller.OrderScheduleLines", {

		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.csr.order.view.OrderScheduleLines
		 */
		onInit: function() {
			var oViewModel = this.createViewModel();
			this.getView().setModel(oViewModel, "orderScheduleLineViewModel");
			this.getOwnerComponent().getRouter().getRoute("OrderScheduleLines").attachPatternMatched(this.onObjectMatched, this);
		},
		createViewModel: function() {
			return new JSONModel({
				"delay": 0,
				"busy": false
			});
		},
		onObjectMatched : function (oEvent) {
			var oViewModel = this.getView().getModel("orderScheduleLineViewModel");
			oViewModel.setProperty("/busy", true);
			var itemIndex = oEvent.getParameter("arguments").itemIndex;
			this.context = oEvent.getParameter("arguments").context;
			var itemScheduleLines = this.getOwnerComponent().getModel("cartItemsModel").getProperty("/ItemSet/" + itemIndex + "/SchedLineSet");
			var itemPriceConditions = this.getOwnerComponent().getModel("cartItemsModel").getProperty("/ItemSet/" + itemIndex + "/PriceCondSet");
			var item = this.getOwnerComponent().getModel("cartItemsModel").getProperty("/ItemSet/" + itemIndex);
			var orderScheduleLineViewModel = this.getView().getModel("orderScheduleLineViewModel");
			orderScheduleLineViewModel.setProperty("/scheduleLines", itemScheduleLines);
			orderScheduleLineViewModel.setProperty("/scheduleLinesCount", itemScheduleLines.length);
			orderScheduleLineViewModel.setProperty("/priceConditions", itemPriceConditions);
			orderScheduleLineViewModel.setProperty("/priceConditionsCount", itemPriceConditions.length);
			orderScheduleLineViewModel.setProperty("/item", item);
			oViewModel.setProperty("/busy", false);
		},
		onNavBack: function() {
			this.handleCancel();
		},
		handleCancel: function() {
			if (this.context === "cart") {
				this.getOwnerComponent().getRouter().navTo("Home", null, true);
			} else {
				this.getOwnerComponent().getRouter().navTo("OrderShipment", null, true);
			}
		}
	});

});