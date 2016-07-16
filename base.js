var $j = jQuery;

var WordCloud = WordCloud || {};

WordCloud.ready = function() {
	var that = this;
	WordCloud.c = new WordCloud.Chart(WordCloud.array_data, {
		"tfidfMetric": "tf-idf",
		"interceptMetric": "intercept",
		"degreeMetric": "degree"
	});

	// Forward change of radius to reapply force layout.
	WordCloud.scaleRadius = function(){
		WordCloud.c.bubbleLayout();
	};

	WordCloud.c.init();
	WordCloud.c.start();
	WordCloud.scaleRadius();
}

/*
 *  Check if svg is supported and start visualization.
 */
if (!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect){
	// Forward document ready event to WordCloud visualization.
	$j(document).ready($j.proxy(WordCloud.ready, this));
	
	// Append footer, if not already done.
	$j("#wpcontent").append($j("#footer"));
} else {
	alert("Your browser seems to not support svg rendering.");
}