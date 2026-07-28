sap.ui.define([
	'com/csr/order/controller/BaseController'
], function (BaseController) {
	"use strict";
	//
	return BaseController.extend("com.csr.order.controller.Home", {
		onInit: function () {
			this.getOwnerComponent().getRouter().getRoute("Home").attachPatternMatched(this.onObjectMatched, this);
		},
		onObjectMatched: function (oEvent) {
			this.oEventBus = this.getEventBus();
			this.oEventBus.publish("home", "hideMaster", {});
		},
		onAfterRendering: function () {
			$(".posMSplitContainerMaster").on("swiperight", function (e) {
				return false;
			});
		}

	});
});