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
  res.render('index.html', { title: 'Express' });
});

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

		client.hvals("AccountServer:"+today+":requestID2Str", function (err, keys) {
		
			for(var i=0; i<keys.length; i++){

				var item = {};
				item['id'] = i;
				item['reqstr'] = keys[i];
				result_array.push(item);
					
			}	//for end		

			res.json(result_array);

		});   //hvals end

	});   //post end

/* 
 * config table获取数据:
 * source:config table
 * target:config文件夹
 */
router.route('/getConfigName')
	.get(function(req, res, next){

		console.log('/getConfigName');

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

		});  //readdir end

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
		var config_path = path.join(process.cwd(), '/public/config/'+config_name+'.json');		

		//取出config_name中的reqstr
		fs.readFile(config_path, function(err, data){
			if(err){
				console.log('err:'+err);
			}

			var data_json = JSON.parse(data);
			var snapshot_column = data_json.snapshot.columns;			

			//取出columns name
			for(var i=0; i<snapshot_column.length; i++){				
				result.columns.push(snapshot_column[i].name);
				result.show.push(snapshot_column[i].show);	
			}

			var request_id_list = data_json.snapshot.snapshot_lines;			

			//reqstr--id--keys和vals
			if(request_id_list.length != 0){

				var d = new Date();
				var today = d.toJSON().substring(0,10).replace(/-/g,'');
				//因为request_id_list有的元素可能找不到值，所以需要用count表示有用的reqstr的个数
				var count = request_id_list.length

				for(var i=0; i<request_id_list.length; i++){

					//闭包 1
					(function(num){						  
						
						//reqstr -- id
						client.hget('AccountServer:'+today+':requestStr2ID', request_id_list[num], function (err, keys) {

								if(keys !== null){

									var item = {};

									//是今天的
									var list_name = 'Respond:'+today+':'+keys+'!';

									//id -- keys
									client.hkeys(list_name, function (err, keys) {
										//id --val
										client.hvals(list_name, function (err, vals) {	
										    				    
										    vals.forEach(function (reply, i) {	
										        item[keys[i]] = reply;
										    });	

										    result.result_array.push(item);
										
											if(result.result_array.length == count){
												console.log('reqstr num :'+count);
												res.json(result);
											}	

										});  //hvals end

									});	   //hkeys end

								}else{

									console.log('reqstr null');
									//不是今天的
									count--;
									if(result.result_array.length == count){
										console.log('null reqstr num:'+count);
										res.json(result);
									}									

								}    //else end															

						});		  //hget end

					})(i)   //闭包1 end					

				}    //for end

			}else{
				
				res.json(result);

			}

		});  //readFile end	
							
	})   //get end

/* 
 * 删除配置文件中的reqstr
 * source:snapshot
 * target:config文件
 */
router.route('/delReqStr')
	.get(function(req, res, next){

		var result = {};

		var del_path = path.join(process.cwd(), '/public/config/'+req.query.config_name+'.json')
		
		fs.readFile(del_path, function(err, data){

			if(err){

				console.log('err:'+err);
				result.message = 'delReqStr readfile fail, '+err;
				res.json(result);				

			}else{

				var data_json = JSON.parse(data);

				//去掉数组中的一个元素
				var index = data_json.snapshot.snapshot_lines.indexOf(req.query.reqstr);

				data_json.snapshot.snapshot_lines.splice(index, 1);				

				fs.writeFile(del_path, JSON.stringify(data_json, function(key, value){return value;}, 4), function(err){
					
					if(err){

						console.log('delReqStr writefile fail, '+err);
						result.message = 'delReqStr writefile fail, '+err;
						res.json(result);
						
					}else{
						console.log('del success');
						result.message = 'del reqstr writefile success';
						res.json(result);
					}

				});   //writeFile end

			}  //readFile success

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

		var result = {};

		var save_path = path.join(process.cwd(), '/public/config/'+req.body.name+'.json')

		fs.readFile(save_path, function(err, data){
			if(err){

				console.log('err:'+err);				

			}else{
				console.log('data:'+data);

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
						result.message = 'config save success';
						res.json(result);
					}

				});   //writeFile end

			}  //else end		

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

		var result = {};

		fs.readFile(path.join(process.cwd(), '/public/config/'+req.body.config_name_current+'.json'), function(err, data){
			if(err){
				console.log('err:'+err);
			}else{
				console.log('data:'+data);						

				//把default.json中的snapshot_lines设为{}
				var old_data = 	JSON.parse(data);

				if(req.body.config_name_current == 'default'){

					//当config是default时，把default清空
					old_data.snapshot.snapshot_lines = [];
					old_data.snapshot.columns = [];

					fs.writeFile(path.join(process.cwd(), '/public/config/'+req.body.config_name_current+'.json'), JSON.stringify(old_data, function(key, value){return value;}, 4), function(err){
						
						if(err){
							console.log('write fail:'+err);
						}else{
							console.log('write success');							
						}

					});   //writeFile end

				}else{

					//当config不是default时，只需要复制

				}			
				
				var save_path = path.join(process.cwd(), '/public/config/'+req.body.name+'.json')
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
						result.message = 'config saveas success';
						res.json(result);
					}

				});   //writeFile end

			}   //else end

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

		var result = {};

		var add_path = path.join(process.cwd(), '/public/config/'+req.body.config_name+'.json');

		fs.readFile(add_path, function(err, data){
			if(err){
				console.log('addReqStr readFile fail, '+err);
				result.message = 'addReqStr readFile fail, '+err;
				res.json(result);
			}

			var new_data = JSON.parse(data);

			var d = new Date();
			var today = d.toJSON().substring(0,10).replace(/-/g,'');
			var list_name = 'Respond:'+today+':'+req.body.id+'!';

			//id -- keys
			client.hkeys(list_name, function (err, keys) {
				
				//for 1
			    for(var i=0; i<keys.length; i++){
			    	
		    		//对于每个key[num],先检查一下columns里面有没有，没有的话，再添加。
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

				var snapshot_lines = new_data.snapshot.snapshot_lines;	

				var sign = 0;

				for(var i=0; i<snapshot_lines.length; i++){
					if(req.body.reqstr == snapshot_lines[i]){
						sign = 1;
					}
				}				

				if(sign == 1){

					//已有此元素
					console.log('already has:'+req.body.reqstr);
					result.message = 'already has:'+req.body.reqstr;
					res.json(result);					

				}else{

					//没有此元素
					console.log('has no:'+req.body.reqstr);

					new_data.snapshot.snapshot_lines.push(req.body.reqstr);

					fs.writeFile(add_path, JSON.stringify(new_data, function(key, value){return value;}, 4), function(err){
						if(err){
							console.log('write reqstr:'+err);
							result.message = 'addReqStr writeFile fail, '+err;
							res.json(result);
						}else{
							result.message = 'addReqStr success';
							res.json(result);
						}

					});  //writeFile

				}  //else end								

			});   //hkeys end			

		});  //readFile

	});  //post end

module.exports = router;

