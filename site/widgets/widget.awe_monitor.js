(function () {
    widget = Retina.Widget.extend({
        about: {
                title: "AWE Task Status Monitor",
                name: "awe_monitor",
                author: "Tobias Paczian",
                requires: [ ]
        }
    });
    
    widget.setup = function () {
	    return [ Retina.add_renderer({"name": "table", "resource": "./renderers/",  "filename": "renderer.table.js" }),
  		     Retina.load_renderer("table") ];
    };

    widget.tables = [];
        
    widget.display = function (wparams) {
	// initialize
        widget = this;
	var index = widget.index;

	var update = document.getElementById('refresh');
	update.innerHTML = '\
<div class="alert alert-block alert-info" style="width: 235px;">\
  <button type="button" class="close" data-dismiss="alert">×</button>\
  <h4>updating...</h4>\
  <div class="progress progress-striped active" style="margin-bottom: 0px; margin-top: 10px;">\
    <div class="bar" style="width: 0%;" id="pbar"></div>\
  </div>\
</div>';

	widget.updated = 0;

	var views = [ "overview",
		      "active",
		      "suspended",
		      "queuing_workunit",
		      "checkout_workunit",
		      "clients" ];

	for (i=0;i<views.length;i++) {
	    var view = document.getElementById(views[i]);
	    view.innerHTML = "";
	   
	    if (views[i] != "overview") {
		var target_space = document.createElement('div');
		target_space.innerHTML = "";
		view.appendChild(target_space);
		widget.tables[views[i]] = Retina.Renderer.create("table", { target: target_space, data: {}, filter_autodetect: true, sort_autodetect: true }); 
	    }
	    
	    widget.update_data(views[i]);
	}
    };

    widget.update_data = function (which) {
	var return_data = {};

	switch (which) {
	case "overview":	    
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/queue", function(data) {
		var result = data.data;
		var rows = result.split("\n");
		
		return_data = { "total jobs": { "all": rows[1].match(/\d+/)[0],
						"in-progress": rows[2].match(/\d+/)[0],
						"suspended": rows[3].match(/\d+/)[0] },
				"total tasks": { "all": rows[4].match(/\d+/)[0],
						 "queuing": rows[5].match(/\d+/)[0],
						 "pending": rows[6].match(/\d+/)[0],
						 "completed": rows[7].match(/\d+/)[0],
						 "suspended": rows[8].match(/\d+/)[0],
						 "failed and skipped": rows[9].match(/\d+/)[0] },
				"total workunits": { "all": rows[10].match(/\d+/)[0],
						     "queueing": rows[11].match(/\d+/)[0],
						     "checkout": rows[12].match(/\d+/)[0],
						     "suspended": rows[13].match(/\d+/)[0] },
				"total clients": { "all": rows[14].match(/\d+/)[0],
						   "busy": rows[15].match(/\d+/)[0],
						   "idle": rows[16].match(/\d+/)[0],
						   "suspended": rows[17].match(/\d+/)[0] } };
		
		var html = '<h4>Overview</h4><table class="table">';
		for (h in return_data) {
		    if (return_data.hasOwnProperty(h)) {
			html += '<tr><th colspan=2>'+h+'</th><th>'+return_data[h]['all']+'</th></tr>';
			for (j in return_data[h]) {
			    if (return_data[h].hasOwnProperty(j)) {
				if (j == 'all') {
				    continue;
				}
				html += '<tr><td></td><td>'+j+'</td><td>'+return_data[h][j]+'</td></tr>';
			    }
			}
		    }
		}
		html += '</table>';
		
		Retina.WidgetInstances.awe_monitor[1].check_update();

		document.getElementById('overview').innerHTML = html;
	    });
	    return;

	    break;
	case "active":
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/job?active", function (data) {
		var result_data = [];
		if (data.data != null) {
		    for (h=0;h<data.data.length;h++) {
			var obj = data.data[h];
			result_data.push( [ obj.info.submittime,
					    "<a href='http://"+RetinaConfig["awe_ip"]+"/job/"+obj.id+"' target=_blank>"+obj.jid+"</a>",
					    obj.info.name,
					    obj.info.user,
					    obj.info.project,
					    obj.info.pipeline,
					    obj.info.clientgroups,
					    obj.tasks.length - obj.remaintasks || "0",
					    obj.tasks.length,
					    obj.state,
                                            obj.updatetime
					  ] );
		    }
		}
		if (! result_data.length) {
		    result_data.push(['-','-','-','-','-','-','-','-','-','-','-']);
		}
		return_data = { header: [ "created",
					  "jid",
					  "name",
					  "user",
					  "project",
					  "pipeline",
					  "group",
					  "t-complete",
					  "t-total",
					  "state", 
                                          "updated"],
				data: result_data };

		Retina.WidgetInstances.awe_monitor[1].tables["active"].settings.minwidths = [1,1,65,100,75,85,90,75,110,75,75];
		Retina.WidgetInstances.awe_monitor[1].tables["active"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["active"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    });

	    break;
	case "suspended":
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/job?suspend", function (data) {
		var result_data = [];
		if (data.data != null) {
		    for (h=0;h<data.data.length;h++) {
			var obj = data.data[h];
			result_data.push( [ obj.info.submittime,
                                            "<a href='http://"+RetinaConfig["awe_ip"]+"/job/"+obj.id+"' target=_blank>"+obj.jid+"</a>",
					    obj.info.name,
					    obj.info.user,
					    obj.info.project,
					    obj.info.pipeline,
					    obj.info.clientgroups,
					    obj.tasks.length - obj.remaintasks || "0",
					    obj.tasks.length,
					    obj.state,
                                            obj.updatetime
					  ] );
		    }
		}
		if (! result_data.length) {
		    result_data.push(['-','-','-','-','-','-','-','-','-','-','-']);
		}
		return_data = { header: [ "submitted",
					  "jid",
					  "name",
					  "user",
					  "project",
					  "pipeline",
					  "group",
					  "t-complete",
					  "t-total",
					  "state",
                                          "updated"],
				data: result_data };

		Retina.WidgetInstances.awe_monitor[1].tables["suspended"].settings.minwidths = [1,1,65,100,75,85,90,75,110,75,75];
		Retina.WidgetInstances.awe_monitor[1].tables["suspended"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["suspended"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    });

	    break;
	case "queuing_workunit":
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/work?query&state=queued", function (data) {
		var result_data = [];
		if (data.data != null) {
		    for (h=0;h<data.data.length;h++) {
			var obj = data.data[h];
			result_data.push( [ obj.wuid,
					    obj.info.submittime,
					    obj.cmd.name,
					    obj.cmd.args,
					    obj.rank || "0",
					    obj.totalwork || "0",
					    obj.state,
					    obj.failed || "0"
					  ] );
		    }
		}
		if (! result_data.length) {
		    result_data.push(['-','-','-','-','-','-','-','-']);
		}
		return_data = { header: [ "wuid",
					  "submission time",
					  "cmd name",
					  "cmd args",
					  "rank",
					  "t-work",
					  "state",
					  "failed" ],
				data: result_data };

		Retina.WidgetInstances.awe_monitor[1].tables["queuing_workunit"].settings.minwidths = [1,1,1,1,65,75,75,75];
		Retina.WidgetInstances.awe_monitor[1].tables["queuing_workunit"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["queuing_workunit"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    });

	    break;
	case "checkout_workunit":
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/work?query&state=checkout", function (data) {
		var result_data = [];
		if (data.data != null) {
		    for (h=0;h<data.data.length;h++) {
			var obj = data.data[h];
			result_data.push( [ obj.wuid,
					    obj.info.submittime,
					    obj.cmd.name,
					    obj.cmd.args,
					    obj.rank || "0",
					    obj.totalwork || "0",
					    obj.state,
					    obj.failed || "0"
					  ] );
		    }
		}
		if (! result_data.length) {
		    result_data.push(['-','-','-','-','-','-','-','-']);
		}
		return_data = { header: [ "wuid",
					  "submission time",
					  "cmd name",
					  "cmd args",
					  "rank",
					  "t-work",
					  "state",
					  "failed" ],
				data: result_data };

		Retina.WidgetInstances.awe_monitor[1].tables["checkout_workunit"].settings.minwidths = [1,1,1,1,65,75,75,75];
		Retina.WidgetInstances.awe_monitor[1].tables["checkout_workunit"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["checkout_workunit"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    });

	    break;
	case "clients":
	    jQuery.getJSON("http://"+RetinaConfig["awe_ip"]+"/client", function (data) {
		var result_data = [];
		if (data.data == null) {
		    result_data = [ ['-','-','-','-','-','-','-','-','-','-','-','-','-'] ];
		} else {
		    for (h=0;h<data.data.length;h++) {
			var obj = data.data[h];
			result_data.push( [ obj.id,
					    obj.name,
					    obj.group,
					    obj.user || "-",
					    obj.host,
					    obj.cores || "0",
					    obj.apps.join(", "),
					    obj.regtime,
					    obj.serve_time,
					    obj.Status,
					    obj.total_checkout || "0",
					    obj.total_completed || "0",
					    obj.total_failed || "0" ] );
		    }
		}
		return_data = { header: [ "id",
					  "name",
					  "group",
					  "user",
					  "host",
					  "cores",
					  "apps",
					  "register time",
					  "up-time",
					  "status",
					  "c/o",
					  "done",
					  "failed" ],
				data: result_data };

		Retina.WidgetInstances.awe_monitor[1].tables["clients"].settings.minwidths = [1,1,73,73,70,73,1,115,83,75,57,67,68];
		Retina.WidgetInstances.awe_monitor[1].tables["clients"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["clients"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    }).error(function(){
		var result_data = [ ['-','-','-','-','-','-','-','-','-','-','-','-','-'] ];
		return_data = { header: [ "id",
					  "name",
					  "group",
					  "user",
					  "host",
					  "cores",
					  "apps",
					  "register time",
					  "up-time",
					  "status",
					  "c/o",
					  "done",
					  "failed" ],
				data: result_data };
		Retina.WidgetInstances.awe_monitor[1].tables["clients"].settings.minwidths = [1,1,73,73,70,73,1,115,83,75,57,67,68];
		Retina.WidgetInstances.awe_monitor[1].tables["clients"].settings.data = return_data;
		Retina.WidgetInstances.awe_monitor[1].tables["clients"].render();
		Retina.WidgetInstances.awe_monitor[1].check_update();
	    });

	    break;
	default:
	    return null;
	}
    };
    
    widget.check_update = function () {
	Retina.WidgetInstances.awe_monitor[1].updated += 100 / 6;
	Retina.WidgetInstances.awe_monitor[1].updated
	if (parseInt(Retina.WidgetInstances.awe_monitor[1].updated) == 100) {
	    document.getElementById('refresh').innerHTML = '<button class="btn" onclick="Retina.WidgetInstances.awe_monitor[1].display();">refresh</button>';
	} else {
	    document.getElementById('pbar').setAttribute('style', "width: "+Retina.WidgetInstances.awe_monitor[1].updated+"%;");
	}
    }
})();
