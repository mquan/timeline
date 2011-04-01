//use popup plugin
(function () {
var tokenRegex = /\{([^\}]+)\}/g,
    objNotationRegex = /(?:(?:^|\.)(.+?)(?=\[|\.|$|\()|\[('|")(.+?)\2\])(\(\))?/g, // matches .xxxxx or ["xxxxx"] to run over object properties
    replacer = function (all, key, obj) {
        var res = obj;
        key.replace(objNotationRegex, function (all, name, quote, quotedName, isFunc) {
            name = name || quotedName;
            if (res) {
                if (name in res) {
                    res = res[name];
                }
                typeof res == "function" && isFunc && (res = res());
            }
        });
        res = (res == null || res == obj ? all : res) + "";
        return res;
    },
    fill = function (str, obj) {
        return String(str).replace(tokenRegex, function (all, key) {
            return replacer(all, key, obj);
        });
    };
    Raphael.fn.popup = function (X, Y, set, pos, ret) {
        pos = String(pos || "top-middle").split("-");
        pos[1] = pos[1] || "middle";
        var r = 5,
            bb = set.getBBox(),
            w = Math.round(bb.width),
            h = Math.round(bb.height),
            x = Math.round(bb.x) - r,
            y = Math.round(bb.y) - r,
            gap = Math.min(h / 2, w / 2, 10),
            shapes = {
                top: "M{x},{y}h{w4},{w4},{w4},{w4}a{r},{r},0,0,1,{r},{r}v{h4},{h4},{h4},{h4}a{r},{r},0,0,1,-{r},{r}l-{right},0-{gap},{gap}-{gap}-{gap}-{left},0a{r},{r},0,0,1-{r}-{r}v-{h4}-{h4}-{h4}-{h4}a{r},{r},0,0,1,{r}-{r}z",
                bottom: "M{x},{y}l{left},0,{gap}-{gap},{gap},{gap},{right},0a{r},{r},0,0,1,{r},{r}v{h4},{h4},{h4},{h4}a{r},{r},0,0,1,-{r},{r}h-{w4}-{w4}-{w4}-{w4}a{r},{r},0,0,1-{r}-{r}v-{h4}-{h4}-{h4}-{h4}a{r},{r},0,0,1,{r}-{r}z",
                right: "M{x},{y}h{w4},{w4},{w4},{w4}a{r},{r},0,0,1,{r},{r}v{h4},{h4},{h4},{h4}a{r},{r},0,0,1,-{r},{r}h-{w4}-{w4}-{w4}-{w4}a{r},{r},0,0,1-{r}-{r}l0-{bottom}-{gap}-{gap},{gap}-{gap},0-{top}a{r},{r},0,0,1,{r}-{r}z",
                left: "M{x},{y}h{w4},{w4},{w4},{w4}a{r},{r},0,0,1,{r},{r}l0,{top},{gap},{gap}-{gap},{gap},0,{bottom}a{r},{r},0,0,1,-{r},{r}h-{w4}-{w4}-{w4}-{w4}a{r},{r},0,0,1-{r}-{r}v-{h4}-{h4}-{h4}-{h4}a{r},{r},0,0,1,{r}-{r}z"
            },
            offset = {
                hx0: X - (x + r + w - gap * 2),
                hx1: X - (x + r + w / 2 - gap),
                hx2: X - (x + r + gap),
                vhy: Y - (y + r + h + r + gap),
                "^hy": Y - (y - gap)
                
            },
            mask = [{
                x: x + r,
                y: y,
                w: w,
                w4: w / 4,
                h4: h / 4,
                right: 0,
                left: w - gap * 2,
                bottom: 0,
                top: h - gap * 2,
                r: r,
                h: h,
                gap: gap
            }, {
                x: x + r,
                y: y,
                w: w,
                w4: w / 4,
                h4: h / 4,
                left: w / 2 - gap,
                right: w / 2 - gap,
                top: h / 2 - gap,
                bottom: h / 2 - gap,
                r: r,
                h: h,
                gap: gap
            }, {
                x: x + r,
                y: y,
                w: w,
                w4: w / 4,
                h4: h / 4,
                left: 0,
                right: w - gap * 2,
                top: 0,
                bottom: h - gap * 2,
                r: r,
                h: h,
                gap: gap
            }][pos[1] == "middle" ? 1 : (pos[1] == "top" || pos[1] == "left") * 2];
            var dx = 0,
                dy = 0,
                out = this.path(fill(shapes[pos[0]], mask)).insertBefore(set);
            switch (pos[0]) {
                case "top":
                    dx = X - (x + r + mask.left + gap);
                    dy = Y - (y + r + h + r + gap);
                break;
                case "bottom":
                    dx = X - (x + r + mask.left + gap);
                    dy = Y - (y - gap);
                break;
                case "left":
                    dx = X - (x + r + w + r + gap);
                    dy = Y - (y + r + mask.top + gap);
                break;
                case "right":
                    dx = X - (x - gap);
                    dy = Y - (y + r + mask.top + gap);
                break;
            }
            out.translate(dx, dy);
            if (ret) {
                ret = out.attr("path");
                out.remove();
                return {
                    path: ret,
                    dx: dx,
                    dy: dy
                };
            }
            set.translate(dx, dy);
            return out;
    };
})();
//storyline should not be on a separate page (the use flow isn't like that)
//compute storyline in create, if a decent story exists then show it on the show page
//for bookmarklet request show the storyline in popup

(function () {
Raphael.fn.timeline = {
	draw: function(options, describe) {
		var settings = {color: options.color || '#f00',
						normal_r: options.normal_r || 7,
						highlight_r: options.highlight_r || 10,
						highlight_fill: options.highlight_fill || options.color || '#f00',
						normal_fill: options.normal_fill || '#fff',
						bubble_color: options.bubble_color || options.color || '#f00',
						bubble_fill: options.bubble_fill || '#fff'
								},
			//sort events by date in ascending order
			sorted_events = options.events.sort(TimelineHelper.sort_by_date(false)),
			pixels_per_day = 100,
			days_range = TimelineHelper.days_diff(sorted_events[0].date, sorted_events[sorted_events.length-1].date);	
		
		
		//calculate the range in days, avoid division by 0
		if (days_range > 0) {
			pixels_per_day = (this.width-60)/days_range;
		}

		this.timeline.draw_timescale(sorted_events, {x_offset: 30, days_range: days_range});

		this.timeline.draw_events(sorted_events, settings, {pixels_per_day: pixels_per_day, x_offset: 30, y_offset: this.height-70}, describe);
				
	},
	
	draw_events: function(events, settings, params, describe) {
		var dots = [],
			last = params.x_offset,
			txt_attr = {font: '10px verdana, arial, helvetica, sans-serif'},
			title = this.text(40, params.y_offset - 25, 'title').attr(txt_attr).attr({'font-weight': 'bold', 'font-size': '12px'}),
			date = this.text(40, params.y_offset-10, 'date').attr(txt_attr),
			label = this.set().push(title, date).hide(),
			popup_attr = {fill:settings.bubble_fill, "stroke-width":2, stroke: settings.bubble_color},
			popup = '';
						
		for(var i=0;i<events.length;i++) {
			var center = TimelineHelper.getX(events[0].date, events[i].date, params.pixels_per_day) + params.x_offset;
			if(i > 0) {
				last = TimelineHelper.getX(events[0].date, events[i-1].date, params.pixels_per_day) + params.x_offset;
				if(center < (last + settings.normal_r*2)) { //guarantee no overlapped with last node
					center = last + settings.normal_r*2;
				}
				//if center > width then resize the width 
				this.path('M'+ last + ' ' + params.y_offset + 'L' + center + ' ' + params.y_offset).attr({stroke:settings.color, "stroke-width":3}).toBack();
			}

			dots[i] = this.circle(center, params.y_offset, settings.normal_r).attr({fill:settings.normal_fill, stroke:settings.color,"stroke-width":2});
			
			(function (canvas, event) {
				dots[i].hover(function() {
					this.attr({r: settings.highlight_r});
					var name = (event.name.length > 40)? event.name.substring(0, 40) + "..." : event.name;
					title.attr({text: name});
					date.attr({text: event.date});
					label.show();
					var x = this.getBBox().x + this.getBBox().width/2;
					popup = canvas.popup(x, params.y_offset-15, label, "top-middle").attr(popup_attr);						
					if(popup.getBBox().x < params.x_offset) {
						popup.remove();
						popup = canvas.popup(x, params.y_offset-15, label, "top-left").attr(popup_attr);
					}
					else if((popup.getBBox().x + popup.getBBox().width) > (canvas.width - 40)) {
						popup.remove();
						popup = canvas.popup(x, params.y_offset-15, label, "top-right").attr(popup_attr);
					}
					document.body.style.cursor = "pointer";
				}, function() {
					this.attr({r: settings.normal_r});
					label.hide();
					popup.remove();
					document.body.style.cursor = "default";
				});
			
				dots[i].click(function() {
					describe(event);
					for(var j=0;j<dots.length;j++) {
						dots[j].attr({fill:settings.normal_fill});
					}
					this.attr({fill: settings.highlight_fill});
				});
			})(this, events[i]);
		}
	},
	
	//draw timescale marks
	//http://www.tizag.com/javascriptT/javascriptdate.php
	draw_timescale: function(events, params) {
		var days_range = params.days_range,
			x_offset = params.x_offset,
			y = this.height-50,
			unit = 100,
			start_date = '',
			day0 = new Date(events[0].date),
			dayf = new Date(events[events.length-1].date);
			
		if(days_range > 1) {
			unit = (this.width-60)/days_range;
		}
		
		if(days_range < 28) { start_date = day0; }
		else { start_date = TimelineHelper.next_unit(day0, days_range); }
		
		//draw higher reference mark below (month for days and year for months)
		if(days_range < 28) {
			var month0 = day0.getMonth(),
				monthf = dayf.getMonth();
			if(month0 !== monthf) {
				this.text(40, y+20, TimelineHelper.month_in_words(month0) + ' ' + day0.getFullYear());
				this.text(this.width-40, y+20, TimelineHelper.month_in_words(monthf) + ' ' + dayf.getFullYear());
			}
			else {
				this.text(this.width/2, y+20, TimelineHelper.month_in_words(month0) + ' ' + day0.getFullYear());
			}
		}
		else if(days_range < 730 && start_date.getMonth() != 0) {
			this.text(x_offset, y+20, start_date.getFullYear());
		}

		//draw marks for each unit of time
		for(var dd=start_date;dd.getTime() <= dayf.getTime(); dd=TimelineHelper.next_unit(dd, days_range)) {
			var x = TimelineHelper.getX(day0, dd, unit) + x_offset,
				tick = '';
			if(days_range < 28) {
				tick = dd.getDate();
			}
			else if(days_range < 730) {
				tick = TimelineHelper.month_in_words(dd.getMonth());
				if(dd.getMonth() == 0) {
					this.text(x, y+20, dd.getFullYear());
				}
			}
			else  {
				tick = dd.getFullYear();
			}
			this.text(x, y, tick);
		}
	}
};

function TimelineHelper() {}
//derived from: http://stackoverflow.com/questions/979256/how-to-sort-a-json-array
TimelineHelper.sort_by_date = function(reverse){
	var r = (reverse)? -1 : 1;
	return function(a,b){
		var aa = new Date(a.date),
			bb = new Date(b.date);
		if (aa<bb) { return (r * -1); }
		if (aa>bb) { return (r * 1); }
		return 0;
	};
};

TimelineHelper.days_diff = function(date1, date2) {
	return Math.ceil((new Date(date2).getTime() - new Date(date1).getTime())/TimelineHelper.day_in_ms());
};

TimelineHelper.getX = function(first_date, current_date, pixels_per_day) {
	return  pixels_per_day * TimelineHelper.days_diff(first_date, current_date);
};

TimelineHelper.month_in_words = function(n) {
	var m = ''; 
	switch(n) {
		case 0: m = 'January'; break;
		case 1: m = 'February'; break;
		case 2: m = 'March'; break;
		case 3: m = 'April'; break;
		case 4: m = 'May'; break;
		case 5: m = 'June'; break;
		case 6: m = 'July'; break;
		case 7: m = 'August'; break;
		case 8: m = 'September'; break;
		case 9: m = 'October'; break;
		case 10: m = 'November'; break;
		case 11: m = 'December'; break;
		default: m = 'n/a';
	}
	return m.substring(0,3);
};

TimelineHelper.day_in_ms = function() {
	return 86400000;
};

TimelineHelper.next_unit = function(d, days_range) {
	if(days_range < 28) {
		return new Date(d.getTime() + TimelineHelper.day_in_ms());
	}
	else if(days_range < 730) { //get next month
		var year = (d.getMonth() == 11)? d.getFullYear() + 1 : d.getFullYear(),
			month = (d.getMonth() == 11)? 0 : d.getMonth() + 1;
		return new Date(year, month,1);
	}
	else if(days_range < 3650) { //next year
		return new Date(d.getFullYear()+1, 0, 1);
	}
	else { //find next 5 years
		var r = d.getFullYear() % 5;
		return new Date(d.getFullYear()+(5-r), 0, 1);
	}
};
})();