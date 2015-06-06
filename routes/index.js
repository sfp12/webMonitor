var express = require('express');
var router = express.Router();
var redis = require("redis");
var client = redis.createClient();
var fs = require('fs');
var path = require('path');

client.on("error", function (err){
    console.log("Error " + err);
});

/* 
 * 主页 
 */
router.get('/', function(req, res) {
  res.render('table.html', { title: 'Express' });
});

router.get('/test', function(req, res) {
	var result = {};
    result.result_array = [];

	var config_path = path.join(process.cwd(), '/public/config');
	
	fs.readdir(config_path, function(err, files){
	    
	    if(err){
	        console.log('读取config内文件名出错:' + err);
	        result.message = '读取config内文件名出错:' + err;
	    }else{
	    	files.forEach(function(file){
		    	var item = {};
		    	item['configname'] = file.replace('.json', '');
		    	result_array.push(item);
		    })
		    result.message = '读取config内文件成功:';
	    }	    

		res.send(result);

	});	  // readdir end
});

/* 
 * echarts 
 */
// router.get('/echarts', function(req, res) {
//   res.render('echarts.html', { title: 'Express' });
// });

/* 
 * selector table获取数据
 * source:selector table
 * target:hash中的key和value
 */
router.route('/selector')
	.get(function(req, res, next){

		var result_array = [];

		var d = new Date();
		var today = d.toJSON().substring(0,10).replace(/-/g,'');
		
		client.lrange("t-list", '0', '-1', function (err, keys) {
			
			for(var i=0; i<keys.length; i++){
				
				var item = {};
				item['id'] = i;
				item['reqstr'] = keys[i];
				result_array.push(item);				

			}	//for end			

			res.json(result_array);
		});  //hvals end
	});   //post end

/* 
 * config table获取数据:
 * source:config table
 * target:config文件夹
 */
router.route('/getConfigName')
	.get(function(req, res, next){

		var result_array = [];

		var config_path = path.join(process.cwd(), '/public/config');
		
		fs.readdir(config_path, function(err, files){
		    
		    if(err){
		        console.log('读取config内文件名出错:' + err);
		        return;
		    }
		    files.forEach(function(file){
		    	var item = {};
		    	item['configname'] = file.replace('.json', '');
		    	result_array.push(item);
		    })

			res.send(result_array);

		});	  // readdir end

	});   //get end

/* 
 * snapshot table获取数据:
 * source:snapshot table
 * target:config_name.json,keys,value
 */
router.route('/getSnapShot')
	.get(function(req, res, next){
		var result = {};
		result.result_array = [];
		result.columns = [];
		result.show = [];
		result.curve_name = 'webmonitor';

		var config_name = req.query.searchText;
		console.log('config_name:'+config_name);
		var config_path = path.join(process.cwd(), '\\public\\config\\'+config_name+'.json');

		//取出config_name中的reqstr;columns name
		fs.readFile(config_path, function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);
			}

			var data_json = JSON.parse(data);
			//取出columns name
			for(var i=0; i<data_json.snapshot.columns.length; i++){				
				
				result.columns.push(data_json.snapshot.columns[i].name);
				result.show.push(data_json.snapshot.columns[i].show);
				
			}
			console.log('columns:'+result.columns);
			
			var snapshot_lines = data_json.snapshot.snapshot_lines;
			
			var request_id_list = [];
			var snapshot_lines_key = [];
			//遍历snapshot_lines对象的值存入request_id_list
			//这里应该排序：先把snapshot_lines属性存入数组，数组进行排序，再把数组元素对应的值存入request_id_list
			for(key in snapshot_lines){				
				snapshot_lines_key.push(key);
			}

			snapshot_lines_key.sort();

			for(var i=0; i<snapshot_lines_key.length; i++){
				request_id_list.push(snapshot_lines[snapshot_lines_key[i]]);
			}

			console.log('request_id_list:'+request_id_list);

			//reqstr--id--keys和vals
			if(request_id_list.length != 0){

				for(var i=0; i<request_id_list.length; i++){

					//闭包
					(function(num){
						var item = {};
						//snapshot_lines_key存snapshot_lines的key(index0),request_id_list存snapshot_lines的value(sfp1)
						item['index'] = snapshot_lines_key[num].replace('index','');  

						// id -- keys					
						client.hkeys(request_id_list[num], function (err, keys) {

							//  id -- vals						
							client.hvals(request_id_list[num], function (err, vals) {							
							    				    
							    vals.forEach(function (reply, i) {	
							        item[keys[i]] = reply;
							    });	
							    result.result_array.push(item);							
								if(result.result_array.length == request_id_list.length){
									res.json(result);
								}

							});  //hvals end

						});	      //hkeys end

					})(i);	//闭包 end									

				}    //for end

			}else{
				
				res.json(result);
			}

		});	 //readFile end	

	})   //get end

/* 
 * 删除配置文件中的reqstr
 * source:snapshot
 * target:config文件
 */
router.route('/delReqStr')
	.get(function(req, res, next){
		console.log('delReqStr:'+req.query.index);

		var del_path = path.join(process.cwd(), '\\public\\config\\'+req.query.config_name+'.json')
		
		fs.readFile(del_path, function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);
			}

			var data_json = JSON.parse(data);
			data_json.snapshot.snapshot_lines['index'+req.query.index] = undefined;

			fs.writeFile(del_path, JSON.stringify(data_json, function(key, value){return value;}, 4), function(err){
				
				if(err){
					console.log('del reqstr fail:'+err);
				}else{
					console.log('del success');
					var result = {};
					result.message = 'del reqstr success';
				}

			});   //writeFile end

		});  //readFile end

	})  //get end

/* 
 * 保存配置文件
 * source:save
 * target:config文件夹
 */
router.route('/saveConfig')
	.get(function(req, res, next){

	})
	.post(function(req, res, next){

		var save_path = path.join(process.cwd(), '\\public\\config\\'+req.body.name+'.json')

		fs.readFile(save_path, function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);
			}		
			
			//生成新的configname.json
			var new_data = JSON.parse(data);
			new_data.config_name = req.body.name;
			//根据data.cols_show_name,把配置文件中的columns[i].show=true;
			//检查columns中的每个元素，如果在cols_show_name中，则true，否则false
			//for 1
			for(var i=0; i<new_data.snapshot.columns.length; i++){	

				var sign = 0;			

				//for 2
				for(var j=0; j<req.body.cols_show_name.length; j++){
					
						if(req.body.cols_show_name[j] == new_data.snapshot.columns[i].name){

							sign = 1;
						}						
					
				}   //for 2 end

				if(sign == 0){

					//columns[i]不在cols_show_name中
					new_data.snapshot.columns[i].show = false;

				}else{   
					
					//columns[i]在cols_show_name中
					new_data.snapshot.columns[i].show = true;
				}			
				
			} // for 1 end

			fs.writeFile(save_path, JSON.stringify(new_data, function(key, value){return value;}, 4), function(err){
				
				if(err){
					console.log('write fail:'+err);
				}else{
					console.log('write success');
					var result = {};
					result.message = 'config save success';
					res.json(result);
				}

			});   //writeFile end

		});	  //readFile

	});   //post end

/* 
 * 另存配置文件
 * source:saveas
 * target:config文件夹
 */
router.route('/saveAsConfig')
	.get(function(req, res, next){

	})
	.post(function(req, res, next){

		fs.readFile(path.join(process.cwd(), '\\public\\config\\'+req.body.config_name_current+'.json'), function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);
			}			

			//把default.json中的snapshot_lines设为{}
			var old_data = 	JSON.parse(data);

			if(req.body.config_name_current == 'default'){

				//当config是default时，把default清空
				old_data.snapshot.snapshot_lines = {};
				old_data.snapshot.columns = [];

				fs.writeFile(path.join(process.cwd(), '\\public\\config\\'+req.body.config_name_current+'.json'), JSON.stringify(old_data, function(key, value){return value;}, 4), function(err){
					
					if(err){
						console.log('write fail:'+err);
					}else{
						console.log('write success');
						var result = {};
						result.message = 'config save success';
					}

				});   //writeFile end

			}else{

				//当config不是default时，只需要复制

			}			
			
			var save_path = path.join(process.cwd(), '\\public\\config\\'+req.body.name+'.json')
			//生成新的configname.json
			var new_data = JSON.parse(data);
			new_data.config_name = req.body.name;
			//根据data.cols_show_name,把配置文件中的columns[i].show=true;
			//检查columns中的每个元素，如果在cols_show_name中，则true，否则false
			//for 1
			for(var i=0; i<new_data.snapshot.columns.length; i++){	

				var sign = 0;			

				//for 2
				for(var j=0; j<req.body.cols_show_name.length; j++){
					
						if(req.body.cols_show_name[j] == new_data.snapshot.columns[i].name){

							sign = 1;
						}						
					
				}   //for 2 end

				if(sign == 0){

					//columns[i]不在cols_show_name中
					new_data.snapshot.columns[i].show = false;

				}else{   
					
					//columns[i]在cols_show_name中
					new_data.snapshot.columns[i].show = true;
				}			
				
			} // for 1 end

			fs.writeFile(save_path, JSON.stringify(new_data, function(key, value){return value;}, 4), function(err){
				
				if(err){
					console.log('write fail:'+err);
				}else{
					console.log('write success');
					var result = {};
					result.message = 'config saveas success';
					res.json(result);
				}

			});   //writeFile end

		});	  //readFile

	});   //post end

/* 
 * 给.json添加reqstr
 * source:selector add
 * target:config_name.json 
 */
router.route('/addReqStr')
	.get(function(){

	})
	.post(function(req, res, next){

		var add_path = path.join(process.cwd(), '\\public\\config\\'+req.body.config_name+'.json')
		
		fs.readFile(add_path, function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);
			}

			var new_data = JSON.parse(data);

			//根据id找到列，再把列加入
			client.hkeys(req.body.reqstr, function (err, keys) {

				//for 1								
			    for(var i=0; i<keys.length; i++){			    	

		    		//对于每个key[i],先检查一下columns里面有没有，没有的话，再添加。
		    		var sign = 0
		    		
		    		//for 2
		    		for(var j=0; j<new_data.snapshot.columns.length; j++){
		    			
	    				if(keys[i] == new_data.snapshot.columns[j].name){
		    				sign = 1;
		    			}		    			
		    			
		    		}   //for 2 end

		    		if(sign == 0){
		    			var item = {};	
			    		item['name'] = keys[i];
				        item['show'] = false;
				        new_data.snapshot.columns.push(item);
		    		}		    	

			    }  //for 1 end

			    //如果snapshot_lines中没有当前的reqstr，则添加			    
				// if(new_data.snapshot.snapshot_lines['index'+req.body.id] === undefined){
					
					new_data.snapshot.snapshot_lines['index'+new_data.snapshot.snapshot_lines.length] = req.body.reqstr;
					
					fs.writeFile(add_path, JSON.stringify(new_data, function(key, value){return value;}, 4), function(err){
						if(err){
							console.log('write fail:'+err);
						}else{
							console.log('write success');
							var result = {};
							result.message = 'success';
							res.json(result);
						}

					});  //writeFile

				// }	 // if end
			    
			})   //hkeys end			

		});   //readFile

	});   //post end

module.exports = router;

