    


(function (window){

    var cmapnode;

    function load_colormaps(){
	json_query("colormaps/cnames.json", function(err, cnames){
	    if(err){
		return cmap.abort_error(err);
	    }
	    select.options=[];
	    cnames.forEach(function(d,i){
		select.options.push({value : i, label : d});
	    });
	    select.set_options();
	    
	    select.listen('change', function(id){
		json_query("colormaps/cmaps/"+select.options[id].label+".json", function(err, cm){
		    cmap.set_value(cm);
		});
	    })
	    
	});

    }


    function image(blob, dx, dy, ext){
	this.dims=[0,0];
	if(dx!==undefined) this.dims[0]=dx;
	if(dy!==undefined) this.dims[1]=dy;
	if(blob!==undefined) this.data=blob;
	if(ext!==undefined) this.ext=ext;
    }

    function colormap(){
	
	var cmap=this;

	cmap.value = [[0,0,0,1,0],[0.7,0.2,0.1,1,0.2],[0.8,0.9,0.1,1,0.6],[1,1,1,1,1]];

	function hex2rgb(hex) {
	    
	    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
		
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	    } : null;
	}
	
	function rgb2hex(r, g, b) {
	    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	function hex_color(c) {
	    return rgb2hex(Math.floor( (c[0]*255)), Math.floor( (c[1]*255)), Math.floor( (c[2]*255)) );
	}
	
	
	var o,i,b,rng,uniform,split;
	
	cmap.selected_section=-1;
	
	new_event(cmap,"colormap_changed");
	
	

	
	cmap.set_hex_color = function(cid, color){
	    console.log("set color id " + cid + " col " + JSON.stringify(color));
	    var rbgc=hex2rgb(color);
	    var cv=cmap.value[cid];
	    if(typeof cv != 'undefined'){
		cv[0]=rbgc.r/255.0;
		cv[1]=rbgc.g/255.0;
		cv[2]=rbgc.b/255.0;
	    }else
		console.log("Error : color " + cid + " NC = " + this.value.length);
	}
	
	cmap.write_gradient_css_string=function(){
	    //if(!this.value) return;
	    var cstr='linear-gradient(to right';
	    
	    for (var i=0;i<this.value.length;i++){
		
		var r=Math.floor(this.value[i][0]*255);
		var g=Math.floor(this.value[i][1]*255);
		var b=Math.floor(this.value[i][2]*255);
		var a=Math.floor(this.value[i][3]*255);
		var f=this.value[i][4]*100;
		
		cstr+=",rgba("+r+","+g+","+b+","+a+") "+f+"%";
	    }
	    cstr+=")";
	    this.gradient_css_string=cstr;
	    return this.gradient_css_string;
	}
	
	cmap.select_section=function(cid){
	    if(cmap.selected_section!=cid){
		cmap.display_color_section(cid);
		//console.log("!changed section  " + cid + " frac= " + frac + " P=" + screen_pix[0]);
	    }
	}
	
	
	//    cmap.domnode.style.background=cmap.write_gradient_css_string();
	
	cmap.on_slide=function(slided){
	    //console.log("CMAP slided !!");
	    //console.log(cmap.name + " display " + this.value.length + " colors. w = " + cmap.parent.ui_root.clientWidth);
	    //cmap.domnode.style.width=cmap.ui_root.clientWidth;
	    //cmap.display(ui_opts);
	}
	

	
	cmap.update_colors = function(){
	    cmap.css_color_gradient=cmap.write_gradient_css_string();
	    cmapnode.style.background=cmap.css_color_gradient;
	    cmap.trigger("colormap_changed", cmap );
	}
	
	cmap.set_value=function(v){
	    if(typeof v !='undefined')
		cmap.value=v;
	    cmap.update_colors();
	    if(cmap.ui_opts.type==='edit')
		cmap.select_section(0);
	    cmap.display();
	}

    }


    function glscreen(base_node){	

	var gls=this;
	
	gls.w=0;
	gls.h=0;
	
	gls.bbig=null;
	
	base_node.add_class("drawing_node");

	var ui=gls.ui=cc("div", base_node);ui.add_class("glscreen");
	var canvas=gls.canvas=cc("canvas",ui); canvas.add_class("glscreen_3d");
	var canvas2d=gls.canvas2d=cc("canvas",ui); canvas2d.add_class("glscreen_2d");
	
	var mouseon = false;
	var mouse_start={};
	var t_start=[];
	
	new_event(gls,"resize");
	new_event(gls,"dragging");
	new_event(gls,"drag_end");
	new_event(gls,"drag_begin");
	new_event(gls,"wheel");
	new_event(gls,"cursor_move");
	new_event(gls,"pan");

	function log(t){ cmapnode.innerHTML=t;}

	/*
	ui.addEventListener("touchstart", function(e){
	    e.preventDefault();
	    var touches=e.changedTouches;
	    log("START " + touches.length);
	    console.log("START " + touches.length);
	}, false);
	ui.addEventListener("touchend", function(e){
	    e.preventDefault();
	    var touches=e.changedTouches;
	    log("END " + touches.length);
	}, false);
	ui.addEventListener("touchcancel", function(e){
	    e.preventDefault();
	    var touches=e.changedTouches;
	    log("CANCEL " + touches.length);
	}, false);
	ui.addEventListener("touchmove", function(e){
	    e.preventDefault();
	    var touches=e.changedTouches;
	    log("MOVE " + touches.length);
	}, false);
*/
	
	var zt = new ZingTouch.Region(base_node);

	var zt_expand=new ZingTouch.Expand({});
	var zt_pinch=new ZingTouch.Pinch({});
	var zt_pan=new ZingTouch.Pan({numInputs: 1});
	var zt_pan3=new ZingTouch.Pan({numInputs: 2});

	
	zt.bind(ui, zt_pan, function(e){
	    //console.log("Pan D=" + JSON.stringify(e.detail));
	    log("PAN");
	    gls.trigger("pan", { type : e.detail.events[0].type, x : e.detail.events[0].x, y : e.detail.events[0].y} );
	}, false);

	zt.bind(ui, zt_pan3, function(e){
	    //console.log("Pan3 D=" + JSON.stringify(e.detail));
	    log("PAN3");
	    //gls.trigger("pan3", { type : e.detail.events[0].type, x : e.detail.events[0].x, y : e.detail.events[0].y} );
	}, false);
	
	zt.bind(ui, zt_expand, function(e){
	    gls.trigger("expand", e.detail.distance );
	    log("EXPAND");
	   // console.log("Expand " + e.detail.distance);
	}, false);

	zt.bind(ui, zt_pinch, function(e){
	    gls.trigger("pinch", e.detail.distance );
	    log("PINCH");
	    //console.log("Pinch " + e.detail.distance);
	}, false);

	
	function get_screen_position(e){
	    var screen_pix=[];
	    if(e.offsetX) screen_pix=[e.offsetX, e.offsetY];
	    else if(e.layerX)screen_pix=[e.layerX, e.layerY];
	    
	    return screen_pix;
	}
	
	canvas2d.addEventListener('mousemove', function(e){
	    gls.trigger("cursor_move",{ cursor : get_screen_position(e)});
	}, true);
	
	canvas2d.addEventListener('mousedown', function(e) {
	    e.preventDefault();
	    //var lastX = e.pageX;
	    var start_pos = get_screen_position(e);
	    //document.documentElement.className += ' dragging';
	    document.documentElement.addEventListener('mousemove', moveHandler, true);
	    document.documentElement.addEventListener('mouseup', upHandler, true);
	    
	    gls.trigger("drag_begin",{ cursor : get_screen_position(e), from : start_pos});
	    
	    function moveHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		// var deltaX = e.pageX - lastX;
		// lastX = e.pageX;
		// leftPercent += deltaX / parseFloat(document.defaultView.getComputedStyle(xdone_node).width) * 100;
		gls.trigger("dragging",{ cursor : get_screen_position(e), from : start_pos});
	    }
	    
	    function upHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		document.documentElement.className = document.documentElement.className.replace(/\bdragging\b/, '');
		document.documentElement.removeEventListener('mousemove', moveHandler, true);
		document.documentElement.removeEventListener('mouseup', upHandler, true);
		
		gls.trigger("drag_end",{ cursor : get_screen_position(e), from : start_pos});
	    }
	}, false);
	
	
	canvas2d.addEventListener("mouseenter", function(){
	    disable_scroll();
	});
	
	canvas2d.addEventListener("mouseleave", function(){
	    enable_scroll();
	});
	
	
	addWheelListener(canvas2d, function(e){
	    gls.trigger("wheel",e);
	});
	

	gls.webgl_start=function(options, cb){
	    console.log("Canvas : " + gls.canvas);
	    var gl=gls.gl=gls.canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true});
	    
	    if(!gl)
		return cb("WebGL support lacking on your browser, you cannot use this application, sorry!");
	    
	    var available_extensions = gl.getSupportedExtensions();
	    var floatTextures = gl.getExtension('OES_texture_float');
	    
	    if (!floatTextures)
		return cb('WebGL is working, but it does not provide floating point texture on your system !\n\n :< \n\nTry with another video device &| drivers!');

	    gls.resize=function(iw,ih){
		
		canvas.width=iw;
		canvas.height=ih;
		canvas2d.width=iw;
		canvas2d.height=ih;
		
		gls.w=iw;
		gls.h=ih;
		
		//canvas.focus();
		//console.log("resize gl ("+iw+","+ih+")" + gl.drawingBufferWidth+","+ gl.drawingBufferHeight);
		
		//gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.viewport(0, 0, iw, ih);
		
		gls.trigger("resize", { w : iw, h: ih} );
	    }
	    
	    console.log("WebGL init ok");
	    cb(null,gl);
	}

	return this;
    }


    function gl_multilayer(glscreen, layer_objects){


	
	var glm=this;
	var ui_opts=this.ui_opts;
	
	glm.canvas=glscreen.canvas;
	
	var ctx2d=glm.ctx2d=glscreen.canvas2d.getContext("2d");
	var server_root=glm.server_root!==undefined ? glm.server_root : "";


	var rotation_angle=0;
	var rotation_center=[0,0];
	var zoom_value=1.0;
	var translation=[0,0];

	this.ready=false;
	
	//    var layer_objects=glm.elements.layers;
	// var geo=glm.elements.geometry.elements;
	// var tr=glm.tr=geo.translation;
	// var zm=glm.zm=geo.zoom; 
	// var ag=glm.ag=geo.rotation.elements.angle; 
	// var rc=glm.rc=geo.rotation.elements.center;
	
	//    var topng=glm.elements.iexport.elements.topng;
	
	//    var interp_cmap=glm.get("interp_cmap");

	new_event(glm, "close");
	new_event(glm, "view_update");
	
	glm.listen("close", function(){
	    console.log("GLM close !");
	    glm.drawing_node.removeChild(glscreen.ui);
	    delete glm;
	});
	
	glm.pvals=[];
	glm.maxlayers=4;
	glm.layers=[];
	
	//    var cursor=glm.elements.cursor; 
	//    var options_tpl=glm.elements.options; 
	
	//    var layer_ci=[];
	//    var cil = cursor.elements.layers;
	// var i=0;
	// for(var l in cil.elements){
	// 	layer_ci[i]=cil.elements[l];
	// 	i++;
	// };
	
	var layer_enabled = glm.layer_enabled= new Int32Array([0,0,0,0]);
	
	glm.p_vals=new Float32Array(4*8);
	glm.p_rotcenters=new Float32Array(4*2);
	glm.p_layer_range=new Float32Array(4*2);
	glm.ncolors=new Int32Array([0,0,0,0]);
	

	var switches=glm.switches=new Int32Array([1,0,0,0]);    
	glm.cmap_texdata = new Float32Array(16*256);
	glm.cmap_fracdata = new Float32Array(16*256);
	
	

	function create_shader(gldev, shader_source, type) {
	    
	    var shader;
	    
	    if (typeof type == 'undefined')
		shader = gldev.createShader(gldev.FRAGMENT_SHADER);
	    else
		if (type == "x-shader/x-fragment" || type == "fragment") {
		    shader = gldev.createShader(gldev.FRAGMENT_SHADER);
		} else if (type == "x-shader/x-vertex" || type == "vertex") {
		    shader = gldev.createShader(gldev.VERTEX_SHADER);
		} else {
		    shader = gldev.createShader(gldev.FRAGMENT_SHADER);
		}
	    
	    gldev.shaderSource(shader, shader_source);
	    gldev.compileShader(shader);
	    
	    if (!gldev.getShaderParameter(shader, gldev.COMPILE_STATUS)) {
		alert(gldev.getShaderInfoLog(shader));
		return null;
	    }
	    
	    return shader;
	}
	
	
	function get_shader(gldev, script_node) {
	    
	    if (typeof script_node == 'undefined') {
		console.log("Shader-script dom-element ["+""+"] not found!");
		return null;
	    }
	    var str = "";
	    
	    var k = script_node.firstChild;
	    
	    while (k) {
		if (k.nodeType == 3) {
		    str += k.textContent;
		}
		k = k.nextSibling;
	    }
	    
	    //    str=script_node.innerHTML;
	    //    console.log("Got shader code ["+str+"]");
	    return create_shader(gldev, str, script_node.type); 
	    
	}
	
	
	
	glscreen.webgl_start({}, function(error, gl){
	    
	    if(error){
		//alert(error);
		//cb(error);
		console.log(error);
		return;
	    }
	    
	    console.log("Webgl started ok!");
	    
	    glm.gl=gl;
	    
	    
	    glm.interpolate_colormap=function(sw){
    		glm.switches[0]=sw ? 1 : 0;
		//var le_loc=gl.getUniformLocation(glm.program, "u_layer_enabled");
		gl.uniform4iv(glm.switches_loc, glm.switches);
		glm.render();
	    };
	    
	    glm.translate=function(value){
		translation=value;
		gl.uniform2fv(glm.tr_loc, value);
		glm.render();
	    };
	    
	    glm.set_zoom =function(value){
		zoom_value=value;
		update_zoom();
	    };

	    glm.set_rotation_angle=function(value){
		rotation_angle=value;
		update_angle();
		glm.render();
	    };

	    glm.set_rotation_center=function(value){
		rotation_center=value;
		gl.uniform2fv(glm.rotcenter_loc, value);
		glm.render();
	    };
	    
	    glm.set_drawing_node=function(node){
		glm.drawing_node=node;
		glm.drawing_node.appendChild(glscreen.ui);

		glm.listen("view_update", function() {
		    console.log("GLM view update size " + glm.drawing_node.clientWidth + " , " + glm.drawing_node.clientHeight);
		    glscreen.resize(glm.drawing_node.clientWidth, glm.drawing_node.clientHeight);
		    glscreen.canvas.focus();
		    glm.render();
		    
		    //glm.ui_childs.add_child(glscreen.ui, glscreen);
		    //var ov={w:0,h:0};//
		    //var ov=get_overflow(glm.drawing_node);
		    //var sz={w: parseFloat(ov.sty.width)-ov.w, h: parseFloat(ov.sty.height)-ov.h};
		    
		    //var sz={ w : glm.drawing_node.clientWidth, h: glm.drawing_node.clientHeight};
		    //glscreen.resize(sz.w, sz.h);
		});

		/*
		  topng.listen("click", function(){
		  var w=window.open(glm.glscreen.canvas.toDataURL("image/png"));
		  //w.document.write("<img src='"+d+"' alt='from canvas'/>");
		  
		  });
		*/
		
		
	    }

	    glm.update_layer_ranges=function(){
		var w=glscreen.canvas.clientWidth;
		var h=glscreen.canvas.clientHeight;
		
		for(var l=0;l<glm.layers.length;l++){
		    var lay=glm.layers[l];
		    if(typeof lay!='undefined'){
			glm.p_layer_range[2*lay.id]=lay.width*1.0/glm.w;
			glm.p_layer_range[2*lay.id+1]=lay.height*1.0/glm.h;		
		    }
		}
		//console.log("setting new range " + JSON.stringify(glm.p_layer_range));
		
    		var rangeLocation = gl.getUniformLocation(glm.program, "u_layer_range");	
		gl.uniform2fv(rangeLocation, glm.p_layer_range);
	    }
	    
	    
	    function update_angle(){
		var alpha=rotation_angle; 
		gl.uniform1f(glm.angle_loc, alpha);
		glm.g_rmg=[[Math.cos(alpha),Math.sin(alpha)],[-1.0*Math.sin(alpha),1.0*Math.cos(alpha)]];
		glm.g_rmgi=[[glm.g_rmg[0][0],-glm.g_rmg[0][1]],[-glm.g_rmg[1][0],glm.g_rmg[1][1]]];
	    }
	    
	    function update_zoom(){
		glm.gl.uniform1f(glm.zoom_loc, zoom_value);
		glm.render();
	    }
	    
	    glscreen.listen("cursor_move", function(e){
		
		var screen_pos=[e.cursor[0]+.5,glscreen.canvas.clientHeight-e.cursor[1]-.5];
		var cursor_size=[40, 20]; //pixels...
		
		//pointer_info.innerHTML="Screen : (" +screen_pos[0]+"," +screen_pos[1] +") "; 

		//cursor.elements.position.elements.screen.set_value(screen_pos);
		
		//console.log("clear " + glscreen.canvas.clientWidth + " " + glscreen.canvas.clientHeight);
		ctx2d.clearRect(0,0,glscreen.canvas.clientWidth, glscreen.canvas.clientHeight);
		
		// for(var l=0;l<glm.layers.length;l++)
		// 	if(glm.layer_enabled[l])
		// 	    glm.layers[l].update_pointer_info(e.cursor, layer_ci[l]);
	    });
	    
	    
	    glscreen.listen("wheel", function(e){
		var delta=e.deltaY;
		//console.log("wheel : " + delta);
		
		(delta > 0)? zoom_value-=zoom_value/10.0 : zoom_value+=zoom_value/10.0;
		// zm.set_value();
		update_zoom();	    
		
	    });
	    
	    glscreen.listen("resize", function(sz){
		if(glm.program===undefined) return;
		var loc = gl.getUniformLocation(glm.program, "u_screen");
		gl.uniform2f(loc, sz.w,sz.h );
		glm.render();
	    });

	    var trstart;
	    var panx,pany;

	    glscreen.listen("pinch", function(d){
		zoom_value-=zoom_value/10.0*d/3000.0;
		update_zoom();	    
	    });

	    glscreen.listen("expand", function(d){
		zoom_value+=zoom_value/10.0*d/3000.0;
		update_zoom();	    
	    });
	    
	    glscreen.listen("pan", function(e){
		if(e.type=="start"){
		    trstart=[translation[0], translation[1]];
		    panx=e.x; pany=e.y;
		}else{
		    var mouse_delta=[e.x-panx,e.y-pany];
		//console.log("canvas dragging... delta " + JSON.stringify(mouse_delta));
		
		    translation[0]=trstart[0]-mouse_delta[0]/zoom_value;
		    translation[1]=trstart[1]+mouse_delta[1]/zoom_value;
		    
		    
		    gl.uniform2fv(glm.tr_loc, translation);
		    glm.render();
		    
		}
	    });
	    

	    
	    glscreen.listen("drag_begin", function(e){
		trstart=[translation[0], translation[1]];
	    });
	    
	    glscreen.listen("dragging", function(e){
		var mouse_delta=[e.cursor[0]-e.from[0],e.cursor[1]-e.from[1]];
		//console.log("canvas dragging... delta " + JSON.stringify(mouse_delta));
		
		translation[0]=trstart[0]-mouse_delta[0]/zoom_value;
		translation[1]=trstart[1]+mouse_delta[1]/zoom_value;
		
		
		gl.uniform2fv(glm.tr_loc, translation);
		glm.render();
		
	    });
	    
	    
	    
	    glm.render=function () {

		var nl; for(nl=0;nl<glm.layers.length;nl++) if(glm.layer_enabled[glm.layers[nl].id]) break;
		//console.log("GLM render nlayers="+glm.layers.length + " enabled " + nl);
		if(nl===glm.layers.length) return;
		
		var positionLocation = gl.getAttribLocation(glm.program, "vPosition");
		
		//console.log("GLM Render vp " + glm.drawing_node.clientWidth + " , " +  glm.drawing_node.clientHeight);
		//gl.viewport(0, 0, glm.drawing_node.clientWidth, glm.drawing_node.clientHeight);
		
		
		//window.requestAnimationFrame(render, canvas);
		
		gl.clearColor(1.0, 1.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		ctx2d.clearRect(0,0,glm.canvas.clientWidth,glm.canvas.clientHeight);
		
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		
		
		for(var l=0;l<glm.layers.length;l++)
		    if(glm.layer_enabled[glm.layers[l].id]){
			if(glm.layers[l].update_geometry!==undefined)
			    glm.layers[l].update_geometry();
			else
			    console.log("Strange NO UPDATE GEO !");
		    }
		
	    }
	    
	    glm.fullscreen=function(on){
		
		
		
		
		
 		//glm.infs=false;
 	    }
	    
	    
	    function create_vertex_buffer(){
		
		glm.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glm.buffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
		
		gl.bufferData(
		    gl.ARRAY_BUFFER, 
		    new Float32Array([
			-1.0, -1.0,
			1.0, -1.0, 
			-1.0,  1.0, 
			-1.0,  1.0, 
			1.0, -1.0, 
			1.0,  1.0]), 
		    gl.STATIC_DRAW
		);
	    }
	    
	    
	    //var glsl_loc="./"+server_root+"/xd1.glsl";
	    var glsl_loc="./lib/xd1.glsl";
	    console.log("Downloading glsl [" + glsl_loc+"]" );
	    
	    xhr_query(glsl_loc).then(function(shader_src){
		
		console.log("GLM linking programs...");
		
		var texture = gl.createTexture();
		var cmap_texture = gl.createTexture();
		var cmap_frac = gl.createTexture();
		
		glm.texture=texture;
		glm.cmap_texture=cmap_texture;
		glm.cmap_frac=cmap_frac;
		
		var program = glm.program=gl.createProgram();
		var xd1_fragment_shader = create_shader(gl, shader_src);    
		
		//Simplest vertex shader for the unique "static" screen box : all geometry is done in the fragment shader.
		var vertex_shader_src="attribute vec4 vPosition; void main() {gl_Position = vPosition;}";
		
		vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vertex_shader_src);
		gl.compileShader(vertexShader);
		
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, xd1_fragment_shader);
		
		gl.linkProgram(program);
		gl.useProgram(program);
		
		glm.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
		glm.le_loc=gl.getUniformLocation(program, "u_layer_enabled");	
		glm.zoom_loc=gl.getUniformLocation(program, "u_zoom");
		glm.angle_loc=gl.getUniformLocation(program, "u_angle");
		glm.tr_loc=gl.getUniformLocation(program, "u_tr");
		glm.rotcenter_loc=gl.getUniformLocation(program, "u_rotc");
		glm.switches_loc=gl.getUniformLocation(program, "u_switches");
		
		
		gl.uniform4iv(glm.le_loc, layer_enabled);
		gl.uniform4iv(glm.switches_loc, switches);
		
		gl.uniform2f(glm.resolutionLocation, glscreen.canvas.clientWidth, glscreen.canvas.clientHeight);
		gl.uniform1f(glm.zoom_loc, zoom_value );
		// gl.uniform1f(angle_loc, ag.value);
		gl.uniform2fv(glm.tr_loc, translation);
		gl.uniform2fv(glm.rotcenter_loc, rotation_center);
		
		update_angle();
		
		create_vertex_buffer();
		
		glm.trigger("gl_ready");
		

		console.log("GLM : program ready");
		
		//cb(null,glm);
	    }).catch(function(error){
		console.log("Error downloading XD1 shader code " + error);
		glm.message("Error while downloading XD1 shader code : "+error, { type : "danger"});
		
	    });
	    
	    glm.get_layer=function(lid){
		for(var l=0;l<glm.layers.length;l++)
		    if(glm.layers[l].id === lid) return l;
		return undefined;
	    }
	    
	    glm.delete_layer=function(lid){
		var lay=glm.get_layer(lid);
		
		if(lay===undefined) {
		    console.log("No such layer " + lid);
		    return;
		}
		
		glm.layer_enabled[lid]=0;
		//var le_loc=gl.getUniformLocation(glm.program, "u_layer_enabled");
		gl.uniform4iv(glm.le_loc, glm.layer_enabled);
		//glm.nlayers--;
		glm.layers.splice(lay,1);
		
		layer_ci[lid].ui_root.add_class("disabled");
		
		console.log("After delete : NLAYERS = " + glm.layers.length);
		
		glm.trigger("view_update");
		
	    }
	    
	    glm.create_layer=function(image, lid){
		var pro = new Promise(function(oui, non){
		    
		    if(lid===undefined){
			lid=glm.maxlayers+1;
			for(var l=0;l<4;l++)
			    if(glm.layer_enabled[l]===0){
				lid=l; break;
			    }
		    }
		    
		    if(lid<0 || lid>=glm.maxlayers){
			alert("["+lid+"]All four layers already active, please remove one before adding a new one.");
			return non("No more layers available!");
		    }
		    
		    var ex_lay=glm.get_layer(lid);
		    if(ex_lay!==undefined){
			glm.layers[ex_lay].trigger("close");
			//glm.delete_layer(lid);
		    }
		    
		    console.log("Creating new layer at position " + lid);

		    
		    
		    var layer=new gl_image_layer(glm,lid);

		    console.log("Creating DONE new layer at position " + lid);
		    
		    //var lay_ui=create_ui({}, layer, 0);
		    //layer.xd1_attach(glm, lid);
		    
		    
		    
		    layer.listen("name_changed", function(n){
			//console.log("Layer name changed");
			//layer_ci[this.id].subtitle=n;
			//layer_ci[this.id].set_title("Layer "+this.id);
		    });
		    
	    	    
		    //layer.set_title(image.name);
		    
		    // layer.cmap.listen("colormap_changed", function(cm){
		    //     //layer_ci[lid].cmdiv.style.background=cm.css_color_gradient;
		    // });
		    
		    
		    
		    //layer.container=layer_objects.ui_childs;
		    //layer_objects.add_child(layer);
		    //layer.view_update_childs();
		    
		    glm.layers.push(layer);
		    glm.layer_enabled[lid]=1;
		    //var le_loc=gl.getUniformLocation(glm.program, "u_layer_enabled");
		    gl.uniform4iv(glm.le_loc, glm.layer_enabled);
		    
		    
		    //layer_ci[lid].ui_root.remove_class("disabled");
		    
		    //glm.nlayers++;
		    
		    
		    if(typeof image != 'undefined'){
			layer.setup_image(image);
		    }
		    console.log("Creating DONE new layer at position " + lid);
		    glm.trigger("view_update");
		    //layer.get('cmap').trigger("colormap_changed", layer.cmap);
		    
		    oui(layer);
		});
		
		return pro;
	    };

	    glm.ready=true;
	});
	
    }

    function gl_image_layer(){

	var def_parameters=
	    [0, //low cut
	     5.0, //high cut
	     0, //Tx
	     0, //Ty
	     1.0, //Scale
	     0, //Rot
	     .85, //Luminosity
	     0
	    ];
	
	var layer=this;
	
	layer.p_values=def_parameters;
	layer.rotcenter=[0,0];
	
	layer.xd1_attach=function(glm, id){
	    this.glm=glm;
	    this.id=id;
	    this.gl=glm.gl;
	    update_pvalues();	    
	    cmap.update_colors();

	    console.log("GLM is " + layer.glm + " program is " + glm.program);
	}

	
	
	var cmap= new colormap();

	// var geometry=layer.get('geometry');
	// var lum=geometry.get('lum');
	// var layer_enable=geometry.get('enable');
	// var tr=geometry.get('translation');
	// var zm=geometry.get('zoom');
	// var ag=geometry.get('angle'); 
	// var rc=geometry.get('center');

	//    var image=layer.get('image');


	new_event(layer,"luminosity");
	new_event(layer,"enable");
	new_event(layer,"translate");
	new_event(layer,"zoom");
	new_event(layer,"rotation_angle");
	new_event(layer,"rotation_center");

	
	var nbins=512;
	var bsize=null; 
	var length;
	cuts_value=[0,0];
	//    var slct=histo_tpl.get('selection');
	//    slct.ui_root.add_class("disabled");
	//histo_tpl.elements.range.ui_root.add_class("disabled");

	//for(var p in cuts) console.log("cutprop " + p);
	//cuts.set_value([12,13]);
	
	
	layer.listen("close", function(){
	    console.log("Layer close !");
	    this.glm.delete_layer(this.id);
	});
	
	
	layer.set_cuts=function(value){
	    cuts_value=value;
	    layer.p_values[0]=value[0];
	    layer.p_values[1]=value[1];
	    //console.log("Cuts changed to " + JSON.stringify(this.value));
	    update_pvalues();
	};

	layer.set_luminosity=function(value){
	    layer.p_values[6]=value;
	    update_pvalues();
	};

	
	layer.enable=function(enable){
	    if(layer.glm===undefined) return;
	    var glm=layer.glm;
	    glm.layer_enabled[layer.id]=enable;
	    var le_loc=layer.gl.getUniformLocation(glm.program, "u_layer_enabled");
	    layer.gl.uniform4iv(le_loc, glm.layer_enabled);
	    glm.render();
	};

	layer.translate=function(value){
	    layer.p_values[2]=value[0];
	    layer.p_values[3]=value[1];
	    update_pvalues();
	};

	layer.zoom=function(value){
	    layer.p_values[4]=value;
	    update_pvalues();
	};

	layer.rotation_angle=function(value){
	    layer.p_values[5]=value;
	    update_pvalues();
	};

	layer.rotation_center=function(value){
	    var rc_loc=layer.gl.getUniformLocation(glm.program, "u_rotcenters");
	    glm.p_rotcenters[2*layer.id]=value[0];
	    glm.p_rotcenters[2*layer.id+1]=value[1];
	    console.log("Setting rotcenter for layer " + layer.id + " : " + JSON.stringify(glm.p_rotcenters));
	    layer.gl.uniform2fv(rc_loc, glm.p_rotcenters);
	    glm.render();
	};

	// tr.listen("change",function(){
	// 	layer.p_values[2]=this.value[0];
	// 	layer.p_values[3]=this.value[1];
	// 	update_pvalues();
	// });

	// zm.listen("change",function(){
	// 	layer.p_values[4]=this.value;
	// 	update_pvalues();
	// });

	// ag.listen("change",function(){
	// 	layer.p_values[5]=this.value;
	// 	update_pvalues();
	// });

	// lum.listen("change",function(){
	// 	layer.p_values[6]=this.value;
	// 	update_pvalues();
	// });

	// rc.listen("change",function(){
	// 	var rc_loc=layer.gl.getUniformLocation(glm.program, "u_rotcenters");
	// 	glm.p_rotcenters[2*layer.id]=this.value[0];
	// 	glm.p_rotcenters[2*layer.id+1]=this.value[1];
	// 	console.log("Setting rotcenter for layer " + layer.id + " : " + JSON.stringify(glm.p_rotcenters));
	// 	layer.gl.uniform2fv(rc_loc, glm.p_rotcenters);
	// 	glm.render();
	
	// });


	layer.update_geometry=  function (){
	    
	    var glm=this.glm;	
	    var alpha_l=1.0*this.p_values[5];
	    
	    this.g_lzoom=1.0*this.p_values[4]; //*glm.zoom;
	    this.g_trl=[1.0*this.p_values[2],1.0*this.p_values[3]]; //glm.tr[]
	    this.g_rm=[[Math.cos(alpha_l),Math.sin(alpha_l)],[-1.0*Math.sin(alpha_l),Math.cos(alpha_l)]];
	    this.g_rmi=[[this.g_rm[0][0],-this.g_rm[0][1]],[-this.g_rm[1][0],this.g_rm[1][1]]];    
	    this.g_screen_center=[glm.canvas.clientWidth/2.0, glm.canvas.clientHeight/2.0];
	    this.g_rotc=[1.0*glm.p_rotcenters[2*this.id],1.0*glm.p_rotcenters[2*this.id+1]];
	    this.g_texc=[this.width/glm.w/2.0, this.height/glm.h/2.0];
	    
	    //    console.log("ROTC = " + JSON.stringify(this.g_rotc) + "TEXC " + JSON.stringify(this.g_texc)+ "TR " + JSON.stringify(this.g_trl) + " scale " + this.g_lzoom + " screen center " + JSON.stringify(this.g_screen_center + " global rot " + JSON.stringify(this.g_rmg)));
	    this.draw_frame();
	}
	
	
	// function auto_cuts22(){
	
	// 	var histo=histo_tpl.value;
	// 	var max=0,maxid=0, total=0, frac=.95, cf=0;

	// 	//console.log("cuts.... ND=" + histo.length);

	// 	for(var i=0;i<histo.length;i++){
	// 	    var v=histo[i];
	// 	    if(v>max){max=v;maxid=i;}
	// 	    total+=v;
	// 	}
	
	// 	var i;
	// 	for(i=0;i<histo.length;i++){
	// 	    cf+=histo[i];
	// 	    if(cf*1.0/total>=frac) break;
	// 	}
	
	// 	//if(maxid>0) maxid-=1;
	// 	var autocouts=[histo_tpl.start+histo_tpl.step*maxid,histo_tpl.start+histo_tpl.step*i];

	// 	//console.log("cuts.... total " + total + " maxid " + maxid + " max " + max + " -> cuts " + JSON.stringify(autocouts));
	

	// 	cuts.set_value(autocouts);
	// 	cuts.onchange();

	// }


	function auto_cuts(){
	    if(layer===undefined) return;
	    if(layer.arr===undefined) return;
	    
	    var ns=2000;
	    var ab=new ArrayBuffer(4*ns);
	    var fa=new Float32Array(ab);
	    var lo=0.05, hi=0.99;

	    var ll=layer.arr.length;
	    for (var i=0;i<fa.length;i++){
		var pix=Math.floor(Math.random()*ll);
		fa[i]=layer.arr[pix];
	    }
	    //var sort=radixsort();
	    var sfa = radixSortLSD(fa);

	    var newcuts=[sfa[Math.floor(lo*ns)], sfa[Math.floor(hi*ns)]];

	    //	for (var i=0;i<sfa.length/20;i++)
	    //	    console.log( i + " : " + sfa[i]);
	    
	    console.log("AUTOCOUT Number of items : " + fa.length, " NB = " + ab.byteLength + " npix="+ll + " CUTS = " + JSON.stringify(newcuts));
	    
	    //cuts_value=newcuts;
	    layer.set_cuts(newcuts);
	    
	    //cuts.set_value(newcuts);
	    //histo_tpl.set_selection(newcuts);
	    //cuts.trigger("change");
	}
	

	function reset_histogram(){

	    if(layer.ext===undefined) return;
	    
	    var low=layer.ext[0];
	    var high=layer.ext[1];

	    cuts_value=[low+.5*bsize,low+(nbins-.5)*bsize];
	    //cuts.set_value([low+.5*bsize,low+(nbins-.5)*bsize]);

	    //console.log("X DOM " + x_domain[0] + ", " + x_domain[1]);
	    //bsize=(high-low)/nbins;
	    
	    compute_histogram(nbins,layer.ext);
	    auto_cuts();

	    var cl2=.5*(cuts_value[1]-cuts_value[0]);
	    var autoc=[cuts_value[0]-cl2, cuts_value[1]+cl2];
	    if(autoc[0]<layer.ext[0])autoc[0]=layer.ext[0];
	    if(autoc[1]>layer.ext[1])autoc[1]=layer.ext[1];
	    
	    compute_histogram(nbins, autoc);
	    //update_histo_cmap();
	    //histo_tpl.config_range();

	    //draw_histogram();
	    
	}
	
	layer.pointer_info  = document.createElement('div');
	layer.pointer_info.className="pointer_info";
	
	layer.width=0;
	layer.height=0;

	layer.g_tr=[0,0];
	layer.g_mrot=[[1,0],[0,1]];
	layer.g_screen_center=[0,0];
	layer.g_scale=1.0;
	
	//var cb= cmap.event_callbacks["colormap_changed"];
	//console.log("Have the cb ? " + cb);

	var cmt;
	
	cmap.listen("colormap_changed", function(cm){
	    var glm=layer.glm;
	    var cmap_data=cmap.value;
	    glm.ncolors[layer.id]=cmap_data.length;

	    //layer.set_title( '<div style="background : '+cm.css_color_gradient+'; width: 100%; height : .5em; display : inline-block; " ></div><span>Layer ' + (layer.id+1)+ '</span>');

	    // if(è(layer.get_title_node)){
	    //     var tn=layer.get_title_node();
	    //     tn.style.background=cm.css_color_gradient;
	    // }
	    
	    var of=256*4*layer.id;
	    for(var cmi=0;cmi<cmap_data.length;cmi++){
		var c=cmap_data[cmi];
		for(var k=0;k<4;k++)
		    glm.cmap_texdata[of+4*cmi+k]=c[k];
		glm.cmap_fracdata[of+4*cmi]=c[4];
	    }
	    
	    for(var cmi=cmap_data.length;cmi<256;cmi++){
		for(var k=0;k<4;k++)
		    glm.cmap_texdata[of+4*cmi+k]=-1.0;
		glm.cmap_fracdata[of+4*cmi]=-1;
	    }
	    
	    // for(var k=0;k<4;k++){
	    //     console.log("Layer " + k + " nc=" + ncolors[k] );
	    //     for(var cmi=0;cmi<ncolors[k];cmi++){
	    // 	console.log("L"+k+" C"+cmi + "=" + cmap_texdata[k*256*4+cmi*4]+","+ cmap_texdata[k*256*4+cmi*4+1]+","+ cmap_texdata[k*256*4+cmi*4+2]+","+ cmap_texdata[k*256*4+cmi*4+3]+"" );
	    //     }
	    // }
	    
	    //console.log("NCOLORS="+JSON.stringify(ncolors));

	    var gl=layer.gl;
	    var ncolors_loc = gl.getUniformLocation(glm.program, "u_ncolors");
	    gl.uniform4iv(ncolors_loc, glm.ncolors);
	    
	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, glm.cmap_texture);
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.FLOAT, glm.cmap_texdata);
	    gl.uniform1i(gl.getUniformLocation(glm.program, "u_cmap_colors"), 1);
	    
	    gl.activeTexture(gl.TEXTURE2);
	    gl.bindTexture(gl.TEXTURE_2D, glm.cmap_frac);
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256,4, 0, gl.RGBA, gl.FLOAT, glm.cmap_fracdata);
	    gl.uniform1i(gl.getUniformLocation(glm.program, "u_cmap_fracs"), 2);
	    
	    
	    glm.render();
	    
	    //console.log("Update colormap for layer "+layer.id + "cm="+JSON.stringify(glm.cmap_fracdata) + " OK" );
	    
	});

	//console.log("Have the cb ? L=" + cb.length);    

	function setup_bbig(w, h){
	    var glm=layer.glm;
	    var gl=glm.gl;
	    //console.log("Setup bbig for image size " + w + ", " + h);
	    
	    function up2(x){var p2=1;while(p2 < x) p2*=2; return p2;}

	    function create_bbig_buffer(w,h){
		var b=new ArrayBuffer(4*4*w*h);
		var fv=b.fv = new Float32Array(b);
		for(var i=0;i<fv.length;i++){
		    fv[i]=0.0;
		}
		return b;
	    }
	    
	    if(glm.bbig!=null){
		if(glm.w>=w && glm.h>=h){
		    //console.log("Buffer big enough " + glm.w + ", " + glm.h);
		    //return; //Ok, GL buffer is big enough
		}else{

		    //We need to resize the GL Buffer...
		    //console.log("Resizing bbig buffer");
		    
		    var w=up2(w);
		    var h=up2(h);
		    
		    //Copy the actual content into the bigger buffer
		    
		    var newbbig=create_bbig_buffer(w,h);
		    var newfv= newbbig.fv;
		    var bbig=glm.bbig;
		    var fv=glm.fv;
		    
		    var n=4*glm.w*glm.h;
		    //for(var c=0;c<n;c++)newfv[c] = fv[c];
		    
		    for(var l=0;l<glm.h;l++){
			for(var c=0;c<4*glm.w;c++){
			    newfv[4*l*w+c] = fv[4*l*glm.w+c];
			}
		    }
		    
		    delete glm.bbig;
		    delete glm.fv;
		    
		    glm.fv=newfv;
		    glm.bbig=newbbig;
		    glm.w=w;
		    glm.h=h;
		    
		    //console.log("Resizing bbig buffer done");
		}

	    }else{
		//console.log("Creating initial bbig");
		var w=glm.w=up2(w);
		var h=glm.h=up2(h);

		//canvas_info.innerHTML="GL texture ("+ w + ", " + h + ")";
		glm.bbig=create_bbig_buffer(w,h);
		glm.fv=glm.bbig.fv;
	    }
	    

	    var resolutionLocation = gl.getUniformLocation(glm.program, "u_resolution");
	    gl.uniform2f(resolutionLocation, glm.w, glm.h);
	    glm.update_layer_ranges();
	    
	}
	
	function init_fits_source() {
	}

	//dinfo.innerHTML+="Requesting image binary data...<br/>";
	
	function draw_histogram(){
	    
	}
	
	
	function compute_histogram(nbins, data_bounds){
	    var data=layer.arr;

	    if(data===undefined){
		console.log("cannot compute histogram : no data !");
		return;
	    }

	    var dl=data.length ? data.length : data.byteLength;
	    
	    var step=(data_bounds[1]-data_bounds[0])/nbins; //histo_tpl.value.length;
	    var start=data_bounds[0];//+.5*step;

	    var range=cuts_value; //histo_tpl.get('range');
	    
	    bsize=(range[1]-range[0])/nbins;

	    var histo=[];
	    for(var i=0;i<nbins;i++){
		histo[i]=0;
	    }
	    
	    console.log("Compute histo Data bounds : " + layer.ext[0] + ", " + layer.ext[1], " bin size = " + bsize + " nbins " + nbins + " ndata=" + dl + " start " + start + " step " + step);
	    
	    
	    for(var i=0;i<dl;i++){
		var v=data[i];
		if(v>=data_bounds[0]&&v<=data_bounds[1]){
		    var bid=Math.floor( (v-data_bounds[0])/step);
		    if(bid>=0&&bid<nbins)
			histo[bid]++; 
		}
	    }

	    /*
	      if(histo_tpl.value===undefined || histo_tpl.value.length===0){
	      histo_tpl.add_plot_linear(histo, start, step);
	      
	      }else{
	      var p= histo_tpl.value[0];
	      p.args[1]=start;
	      p.args[2]=step;
	      p.data=histo;
	      
	      histo_tpl.config_range();
	      //histo_tpl.set_range();
	      }
	    */
	    //console.log("Histo : " + JSON.stringify(layer.histo));
	    
	}  
	
	


	function update_pvalues(){
	    var glm=layer.glm;
	    console.log("update pv for " + glm.program + " pvl "+ glm.p_vals.length);
	    //for(var p in glm) console.log("glm p = " + p);
	    for(var p=0; p<8;p++) glm.p_vals[layer.id*8+p]=layer.p_values[p];
	    //console.log("Setting parms for layer " + layer.id + " : " + JSON.stringify(glm.p_vals) );
	    
	    var pv_loc=layer.gl.getUniformLocation(glm.program, "u_pvals");
	    layer.gl.uniform4fv(pv_loc, glm.p_vals);

	    if(layer.update_geometry !==undefined)
		layer.update_geometry();
	    else
		console.log("UPDATE GEO NOT DEFINED!");
	    glm.render();
	}
	
	layer.setup_image=function(image){
	    
	    var glm=layer.glm;
	    var gl=glm.gl;

	    var iw=image.dims[0];
	    var ih=image.dims[1];
	    var idata=image.data;
	    
	    console.log("Setting up layer " + layer.id + "... Img is " + iw + ", " + ih + " bounds " + image.ext[0] + ", " + image.ext[1]);

	    layer.width=iw;
	    layer.height=ih;
	    
	    layer.p_values[0]=image.ext[0];
	    layer.p_values[1]=image.ext[1];

	    
	    layer.arr=image.data;
	    layer.ext=image.ext;

	    setup_bbig(iw,ih);

	    var w=glm.w;
	    var h=glm.h;

	    var fv=glm.fv;
	    var id=layer.id;

	    //console.log("Setting up layer " + id + "... BIG is " + w + ", " + h + " fv length " + fv.length);


	    for(var i=0;i<ih;i++){
		for(var j=0;j<iw;j++){
		    fv[4*(i*w+j)+id]=1.0*image.data[i*iw+j];
		}
	    }
	    

	    //histo_tpl.set_range(ext);
	    //histo_tpl.set_selection(cuts.value);
	    reset_histogram();
	    //histo_tpl.redraw();

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, glm.texture);
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, glm.fv);
	    gl.uniform1i(gl.getUniformLocation(glm.program, "u_image"), 0);

	    glm.fullscreen(false);

	}
	

	layer.get_screen_pos= function (ipix){
	    var l=this,glm=this.glm;
	    var spos=[ipix[0]-l.width/2.0, ipix[1]-l.height/2.0];
	    var screen_dims=[glm.canvas.clientWidth, glm.canvas.clientHeight];
	    var screen_center=[screen_dims[0]/2.0, screen_dims[1]/2.0];

	    /*	
	    //spos= numeric.dot(l.g_rmi,spos);
	    
	    spos[0]=(spos[0]-l.g_trl[0]);
	    spos[1]=(spos[1]+l.g_trl[1]);
	    
	    spos[0]=spos[0]*l.g_lzoom;
	    spos[1]=spos[1]*l.g_lzoom;
	    
	    //spos= numeric.dot(glm.g_rmgi,spos);
	    
	    spos[0]=(spos[0]-glm.tr.value[0]);
	    spos[1]=(spos[1]+glm.tr.value[1]);
	    
	    spos[0]=spos[0]*glm.zm.value;
	    spos[1]=spos[1]*glm.zm.value;
	    
	    spos[0]+=screen_center[0];
	    spos[1]+=screen_center[1];
	    */
	    return spos;
	}
	
	layer.is_in_screen=function (spos){
	    return (spos[0]<0||spos[0]>=screen_dims[0]||spos[1]<0||spos[1]>=screen_dims[1]) ? false : true; 
	}
	
	
	layer.draw_frame=function(){
	    
	    var l=this, glm=this.glm; //glm.layers[0];
	    //    if(!l) return;
	    var lcorners=[ [0,0], [0,l.height], [l.width, l.height], [l.width, 0] ];
	    var lcenter=[l.width/2.0,l.heigth/2.0];
	    
	    
	    var tcorners=[];
	    for(var c=0;c<lcorners.length;c++) tcorners[c]=l.get_screen_pos(lcorners[c]);
	    var tcenter=l.get_screen_pos(lcenter);
	    var cursor_dims=[50,30];

	    var ctx2d=glm.ctx2d;
	    ctx2d.beginPath();
	    ctx2d.moveTo(tcorners[0][0],tcorners[0][1]);
	    ctx2d.lineTo(tcorners[1][0],tcorners[1][1]);
	    ctx2d.lineTo(tcorners[2][0],tcorners[2][1]);
	    ctx2d.lineTo(tcorners[3][0],tcorners[3][1]);
	    ctx2d.lineTo(tcorners[0][0],tcorners[0][1]);
	    //	    ctx2d.fillStyle = 'yellow';
	    //	    ctx2d.fill();
	    ctx2d.lineWidth = 2;
	    ctx2d.strokeStyle = 'yellow';
	    ctx2d.stroke();
	    ctx2d.closePath();

	    ctx2d.font = "12px sans-serif";//"italic 200 36px/2 Unknown Font, sans-serif";
	    ctx2d.strokeStyle = "yellow"; // set stroke color to blue
	    ctx2d.fillStyle = "white";  // set fill color to red
	    ctx2d.lineWidth = "1";  //  set stroke width to 3pmx

	    ctx2d.strokeText("Layer " + l.id, tcorners[0][0],tcorners[0][1]-10);
	    ctx2d.fillText("Layer " + l.id, tcorners[0][0],tcorners[0][1]-10);

	}

	layer.sample_image_1d= function(start,end,size) {
	    var v=[end[0]-start[0],end[1]-start[1]];
	    var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]);
	    if(typeof size==='undefined') size=Math.floor(l);

	    var d=[v[0]/l,v[1]/l];
	    var dl=l/(size-1.0);
	    //console.log("sample N= " + size+" D="+JSON.stringify(d) + " l= " + l + " dl=" + dl);

	    var c=this.arr;
	    var dims=[this.width,this.height];
	    var b=new ArrayBuffer(4*size);
	    var fb= new Float32Array(b);
	    var x=[];
	    for(var step=0;step<size;step++){
		x[0]=start[0]+d[0]*step*dl;
		x[1]=start[1]+d[1]*step*dl;

		if (x[0]<0||x[0]>=dims[0]||x[1]<0||x[1]>=dims[1]) fb[step]=0.0;
		else
		    fb[step]=c[Math.floor(x[1])*dims[0]+Math.floor(x[0])];

	    }
	    
	    return fb;
	}

	layer.get_image_pixel= function(screen_pixel) {
	    if(typeof this.g_trl=="undefined") return [0,0];


	    var glm=this.glm;

	    var ipix=[
		(screen_pixel[0]-this.g_screen_center[0])/glm.zm.value+glm.tr.value[0]-glm.rc.value[0],
		(screen_pixel[1]-this.g_screen_center[1])/glm.zm.value-glm.tr.value[1]-glm.rc.value[1]
	    ];

	    ipix= numeric.dot(glm.g_rmg,ipix);

	    ipix[0]=((ipix[0]+glm.rc.value[0])/this.g_lzoom+this.g_trl[0]-this.g_rotc[0]);
	    ipix[1]=((ipix[1]+glm.rc.value[1])/this.g_lzoom-this.g_trl[1]-this.g_rotc[1]);

	    ipix= numeric.dot(this.g_rm,ipix);


	    ipix[0]=(ipix[0]+this.g_rotc[0])+this.width/2.0;///glm.w+this.g_texc[0];
	    ipix[1]=this.height/2.0-(ipix[1]+this.g_rotc[1]);///glm.h+this.g_texc[1];

	    return ipix;
	}

	layer.update_pointer_info=function(screen_pixel, cinfo_tpl){

	    
	    if(typeof this.arr === 'undefined') return;
	    
	    //this.update_geometry();

	    var ipix=this.get_image_pixel(screen_pixel);
	    
	    if(ipix[0]<0 || ipix[0]>=this.width || ipix[1]<0 || ipix[1]>=this.height){
		this.pointer_info.innerHTML="outside<br/>image";
		return;
	    }
	    
	    ipix[0]=Math.floor(ipix[0]);
	    ipix[1]=Math.floor(ipix[1]);

	    var pos=ipix[1]*this.width+ ipix[0];
	    var pixel_value = this.arr[pos];
	    //console.log("Set val " + JSON.stringify(ipix) );
	    cinfo_tpl.elements.imgpos.set_value(ipix);
	    cinfo_tpl.elements.pixval.set_value(Math.floor(pixel_value*1000)/1000.0);
	    
	    var cursor_dir=[0,1];
	    var line_height=50;
	    var cursor_pos=[0,0];
	    var screen_dims=[this.glm.canvas.clientWidth,this.glm.canvas.clientHeight];
	    var liney=screen_pixel[1];
	    var ctx2d=this.glm.ctx2d;
	    //var tcenter=e.cursor;
	    var cutsv=cuts.value;


	    this.draw_frame();

	    if(this.glm.elements.options.elements.x_plot.value == true){
		var start=this.get_image_pixel([0,liney]);
		var end=this.get_image_pixel([screen_dims[0],liney]);
		//console.log("asked for " + screen_dims[0] + " start " + JSON.stringify(start)+ " end " + JSON.stringify(end));
		var line_data=this.sample_image_1d(start,end, screen_dims[0]);
		//console.log(" got " + line_data.length + " start " + JSON.stringify(start)+ " end " + JSON.stringify(end));

		ctx2d.beginPath();
		ctx2d.moveTo(0,screen_dims[1]);
		for(var p=0;p<line_data.length;p++)
		    //ctx2d.lineTo(p,line_data[p]/1000.0);
		    ctx2d.lineTo(p,screen_dims[1]-(line_data[p]-cutsv[0])/(cutsv[1]-cutsv[0])*line_height);
		
		ctx2d.lineWidth = 2;
		ctx2d.strokeStyle = 'orange';
		ctx2d.stroke();
		ctx2d.closePath();
	    }
	    
	    //console.log("yplot ? " + this.glm.options.tpl.elements.options.elements.y_plot.value); 

	    if(this.glm.elements.options.elements.y_plot.value == true){
		var start=this.get_image_pixel([screen_pixel[0],0]);
		var end=this.get_image_pixel([screen_pixel[0],screen_dims[1]]);
		//console.log("asked for " + screen_dims[0] + " start " + JSON.stringify(start)+ " end " + JSON.stringify(end));
		var line_data=this.sample_image_1d(start,end, screen_dims[1]);
		
		ctx2d.beginPath();
		ctx2d.moveTo(0,0);
		for(var p=0;p<line_data.length;p++)
		    //ctx2d.lineTo(p,line_data[p]/1000.0);
		    ctx2d.lineTo((line_data[p]-cutsv[0])/(cutsv[1]-cutsv[0])*line_height,p);
		
		ctx2d.lineWidth = 2;
		ctx2d.strokeStyle = 'blue';
		ctx2d.stroke();
		ctx2d.closePath();
	    }
	    //console.log("("+ipix[0]+","+ipix[1]+")<br/>" + Math.floor(pixel_value*1000)/1000.0);
	}
    }


    var FITS = astro.FITS;

    function fits_widget(div,cmap_div, fits_file){
	cmapnode=cmap_div;
	

	console.log("Creating GL Screen...");
	var gls=new glscreen(div);
	console.log("Creating GL MultiLayer Drawer...");
	var glm=new gl_multilayer(gls);

	if(!glm.ready){
	    console.log("GLM is not ready. Aborting!");
	    return;
	}
	
	console.log("Setting up drawing node ... glm is " + glm);
	glm.set_drawing_node(div);
	
	console.log("Loading FITS data ...");
	
	xhr_query(fits_file, {type : "blob"}).then(function(data){
	    console.log("Received FITS data ....");
	    cmapnode.innerHTML="Opening FITS data ...";
	    var fits = new FITS(data, function(){
		
		console.log("FITS opened");
		var hdu = this.getHDU();
		var header = hdu.header;
		var dataunit=hdu.data;

		var opts={ dataunit : dataunit };

		cmapnode.innerHTML="Processing FITS pixels  ...";
		// Get pixels representing the image and pass callback with options
		dataunit.getFrame(0, function(data, opts){// Get dataunit, width, and height from options
		    cmapnode.innerHTML="FITS data ready ...";

		    var dataunit = opts.dataunit;
		    var w= dataunit.width;
		    var h= dataunit.height;
		    var ext = dataunit.getExtent(data);
		    
		    var img=new image(data , w, h, ext);

		    console.log("Frame read : D=("+w+","+h+")  extent " + ext[0] + "," + ext[1] + " wh="+w+","+h);

		    glm.create_layer(img).then(function(){
			console.log("OK");
			glm.render();
		    }).catch(function(e){
			console.error(e);
		    });
		    
		}, opts);
		
	    });
	    
	}).catch(function(e){

	});
    }

    window.fits_widget=fits_widget;

})(window);
