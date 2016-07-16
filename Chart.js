/********************************
 ** Colors and idea based on Shan Carter
 ********************************/

window.WordCloud = window.WordCloud || {};

(function(window, globalWordcloud) {
	var WordCloud = {};
	
	WordCloud.hideTrend = {};
	
	/*
	 *  Detect whether a data set should be visible.
	 */
	var detect = function(d) {
		if(typeof globalWordcloud.hideTrend.popular !== "undefined" &&
			d.trendCategory == globalWordcloud.c.popular) return true;
		if(typeof globalWordcloud.hideTrend.increasing !== "undefined" &&
			d.trendCategory == globalWordcloud.c.increasing) return true;
		if(typeof globalWordcloud.hideTrend.decreasing !== "undefined" &&
			d.trendCategory == globalWordcloud.c.decreasing) return true;
		return false;
	};
	
	/*
	 *  Calculate radius of an unfiltered data set.
	 */
	var getFilteredRadius = function(d){
		if(detect(d)) return 0;
		return d.radius;
	};

	/*
	 *  Constructor method for chart objects.
	 */
	WordCloud.Chart = function(wordCloudData, options) {
		var that = this;

		// Set data settings.
		this.data = wordCloudData;
		this.tfidfMetric = options.tfidfMetric;
		this.interceptMetric = options.interceptMetric;
		this.degreeMetric = options.degreeMetric;

		// Calculate total mass.
		var totalValueForRadius = _.reduce(
			_.pluck(wordCloudData, that.tfidfMetric), function(memo, num){
				return memo + num; }, 0);
		
		// Set visualization resolution.
		this.width = 970;
		this.height = 850;
		this.centerX = this.width / 2;
		this.centerY = 300;

		this.popular = "Popular";
		this.increasing = "Increasing";
		this.decreasing = "Decreasing";
		
		this.totalValue      = totalValueForRadius;
		
		// Set settings for d3.js framework.
		this.defaultGravity  = 0.1;
		
		// Setup function to calculate node charge.
		this.defaultCharge   = function(d, i){
			if (d.value < 0) {
				return 0
			} else {
				return -Math.pow(getFilteredRadius(d), 2.0) / 8 
			};
		};

		this.nodes           = [];
		this.force           = {};
		this.svg             = {};
		this.circle          = {};
		this.gravity         = null;
		this.charge          = null;
		
		// Calculate corresponding appearance from node parameters.
		this.categorizeColor= d3.scale.linear().domain([-0.5, 0.5]).range([-3, 3]).clamp(true); // intercept => color
		this.categorizeBuoyancy= d3.scale.pow().exponent(.5).domain([-0.2, 0.2]).range([-3, 3]).clamp(true); // degree => buoyancy
		this.fillColor       = d3.scale.linear().domain([-3, 0, 3]).range(["#d84b2a", "#AAA", "#7aa25c"]);
		this.strokeColor     = d3.scale.linear().domain([-3, 0, 3]).range(["#c72d0a", "#999", "#5a8731"]);
		this.getStrokeColor = function(d) {
			return that.strokeColor(d.colorCategory);
		};
		this.getFillColor = function(d) {
			return that.fillColor(d.colorCategory);
		};

		// Format tooltip text.
		this.bigFormat       = function(n){return n.toFixed(2);};
		this.nameFormat      = function(n){return n};
		this.degreeFormat       = function(n){return n.toFixed(4);};
		this.interceptFormat    = function(n){return n.toFixed(4);};
			  
		// Scale the total radius metric to 200 pixel radius (determines the size of the diagramm).
		this.rScale = d3.scale.pow().exponent(0.5).domain([0, totalValueForRadius]).range([1,200]);
		this.radiusScale = function(n){ return that.rScale(Math.abs(n)); };
	};

	/*
	 *  Returns a scaled version of the given radius.
	 */
	WordCloud.Chart.scaleTheRadius = function(d, i) {
		if(typeof window.trend !== "undefined") {
			if(d.trendCategory == WordCloud.c.popular &&
				typeof window.trend.popular !== "undefined") {
					return d.radius;
			} else if(d.trendCategory == WordCloud.c.increasing &&
				typeof window.trend.increasing !== "undefined") {
					return d.radius;
			} else if(d.trendCategory == WordCloud.c.decreasing &&
				typeof window.trend.decreasing !== "undefined") {
					return d.radius;
			}
		};
		return 0;
	};

	/*
	 *  Initialize WordCloud Chart.
	 */
	WordCloud.Chart.prototype.init = function() {
		var that = this;

		// Calculate bounding radius.
		this.boundingRadius = this.radiusScale(this.totalValue);

		// Builds the node array from the word data.
		for (var i=0; i < this.data.length; i++) {
			var wordDatum = this.data[i];
			var out = {
				sid: wordDatum['id'],
				word: wordDatum['word'],
				radius: this.radiusScale(wordDatum[this.tfidfMetric]), // tfidd
				value: wordDatum[this.tfidfMetric], // tfidf => radius

				degreeValue: wordDatum[this.degreeMetric], // degree
				buoyancyCategory: this.categorizeBuoyancy(wordDatum[this.degreeMetric]), // degree => buoyancy

				interceptValue: wordDatum[this.interceptMetric], // intercept
				colorCategory: this.categorizeColor(wordDatum[this.interceptMetric]), // intercept => color

				// Set trend category depending on degree and intercept
				trendCategory: (function(datum){
					if(datum[that.degreeMetric] > 0 && datum[that.interceptMetric] > 0) {
						return that.popular;
					} else if (datum[that.degreeMetric] > 0 && datum[that.interceptMetric] <= 0) {
						return that.increasing;
					} else {
						return that.decreasing;
					}
				})(wordDatum),
				
				// random start positions
				x:Math.random() * 1000,
				y:Math.random() * 1000
			}
			this.nodes.push(out);
		};

		// Sort nodes by size to avoid overlays.
		this.nodes.sort(function(a, b){  
			return Math.abs(b.value) - Math.abs(a.value);  
		});

		// Update canvas width.
		this.svg = d3.select("#wordCloudCanvas").append("svg:svg")
			.attr("width", this.width);

		// Join word data with circle representation.
		this.circle = this.svg.selectAll("circle")
			.data(this.nodes, function(d) { return d.sid; });
		
		// Append one circle for each word.
		this.circle.enter().append("svg:circle")
			.attr("r", function(d) { return 0; } )
			.style("fill", function(d) { return that.getFillColor(d); } )
			.style("stroke-width", 1)
			.attr('id',function(d){ return 'wordCloudCircle'+d.sid })
			.style("stroke", function(d){ return that.getStrokeColor(d); })
			.on("mousemove",function(d,i) {
				// Start highlighting on hovering.
				var el = d3.select(this)
				el.style("stroke","#000").style("stroke-width",3);
				// Update tooltip with node information.
				var xpos = Number(el.attr('cx'))
				var ypos = (el.attr('cy') - d.radius - 10)
				d3.select("#wordCloudTooltip").style('top',ypos+"px").style('left',xpos+"px").style('display','block')
					.classed('wordCloudPlus-intercept', (d.colorCategory > 0))
					.classed('wordCloudMinus-intercept', (d.colorCategory < 0))
					.classed('wordCloudPlus-degree', (d.buoyancyCategory > 0))
					.classed('wordCloudMinus-degree', (d.buoyancyCategory < 0));
				d3.select("#wordCloudTooltip .wordCloudName").html(that.nameFormat(d.word));
				d3.select("#wordCloudTooltip .wordCloudDepartment").text(that.nameFormat(d.trendCategory) + " Trend");
				d3.select("#wordCloudTooltip .wordCloudValue").html("tfidf: "+that.bigFormat(d.value));
				d3.select("#wordCloudTooltip #wordCloudDegree").html("degree: "+that.degreeFormat(d.degreeValue));
				d3.select("#wordCloudTooltip #wordCloudIntercept").html("intercept: "+that.interceptFormat(d.interceptValue));
			})
			.on("mouseout",function(d,i) {
				// Stop highlighting.
				d3.select(this)
					.style("stroke-width", 1)
					.style("stroke", function(d) {
						return that.getStrokeColor(d);
					});
				d3.select("#wordCloudTooltip").style('display','none');
			});

		// Provide chainable API.
		return this;
	};

	/*
	 *  Prepare force layout calculation.
	 */
	WordCloud.Chart.prototype.start= function() {
		var that = this;
		// Set data to force layout.
		this.force = d3.layout.force()
			.nodes(this.nodes)
			.size([this.width, this.height]);

		// Enable dragging.
		this.circle.call(that.force.drag);
		
		// Provide chainable API.
		return this;
	};

	/*
	 *  Layout calculation.
	 *  Cluster circles into a bigger circle.
	 */
	WordCloud.Chart.prototype.bubbleLayout = function() {
		var that = this;
		this.force
			.gravity(0)
			.charge(that.defaultCharge)
			.friction(0.9)
			.on("tick", function(e) {
				that.circle
					.each(that._gravitation(e.alpha))
					.each(that._buoyancy(e.alpha))
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
			})
			.start();
			
			this.circle.transition().duration(800).attr("r", function(d){
				return getFilteredRadius(d);
			});

	};

	/*
	 *  Calculate and apply buoyancy force.
	 */
	WordCloud.Chart.prototype._buoyancy = function(alpha) {
		var that = this;
		return function(d) {
			if(detect(d)) return;
			var targetY = that.centerY - (d.buoyancyCategory / 3) * that.boundingRadius;
			d.y = d.y + (targetY - d.y) * (that.defaultGravity) * alpha * alpha * alpha * 100;
		};
	};

	/*
	 *  Calculate and apply gravitation force to form the cluster.
	 */
	WordCloud.Chart.prototype._gravitation= function(alpha) {
		var that = this;
		return function(d) {
			if(detect(d)) {
				d.x = d.prevX || d.x;
				d.y = d.prevY || d.y;
				d.prevX = d.prevX || d.x;
				d.prevY = d.prevY || d.y;
			} else {
				d.prevX = undefined;
				d.prevY = undefined;
			};

			var targetY = that.centerY;
			var targetX = that.width / 2;
			
			d.y = d.y + (targetY - d.y) * (that.defaultGravity + 0.02) * alpha;
			d.x = d.x + (targetX - d.x) * (that.defaultGravity + 0.02) * alpha;
		};
	};
	
	// Reveal interface to WordCloud chart.
	_.extend(globalWordcloud, WordCloud);
})(window, window.WordCloud);