sap.ui.define([], () => {
	"use strict";

	return {
		eventTypeText: function (sCode) {
			if (sCode) {
				switch (sCode) {
				case "BO":
					return "Business Object";
				case "CL":
					return "ABAP Class";
				case "RP":
				case "RA":
					return "RAP Business Object";
				default:
					return sCode;
				}
			}
		},

		loadTypeText: function (sCode) {
			if (sCode) {
				switch (sCode) {
				case "F":
					return "Full Load";
				case "I":
					return "Incremental Load";
				case "P":
					return "Packed Load";
				}
			}
		}
	};
});