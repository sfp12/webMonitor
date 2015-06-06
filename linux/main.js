var main = {};
main.curve_name = '';

$(document).ready(function(){
    var monitor = (function(){
    	//全局变量
        var interval_time = 1000;
        var requestID_interval_time = 5000;    //selector refresh interval             
        //配置文件的名字
        var config_name = 'default';
        //记录返回的列，为了与下次的返回比较，找出新增的列，不显示，但是需要可选择
        var columns_g = [];               
        //如果切换config，则为1，否则为0。因为config不变时，列的比较操作 和 config变化时，列的比较操作不同
        var switch_config = 0;  

        /* 
         * 另存config          
         */
        var saveAsConfig = function(config_name_current, config_name_t){
            
            var data = {};
            data.name = config_name_t;
            data.config_name_current = config_name_current;
            data.cols_show_name = [];

            var cols = $('.main th');
            //记录显示的列
            for(var i=1; i<cols.length/2; i++){             
                data.cols_show_name.push($(cols[i]).text());
            }            

            //必须把它转为字符串
            data = JSON.stringify(data);

            var success = function(data, ts){
                config_name = config_name_t;
                $('.snapshot_caption').text(config_name_t);
                console.log('update config table');
                //更新config table中的数据
                $('#config').bootstrapTable('refresh', {
                    silent: true,
                    url: '/getConfigName'
                });
            }
            
            $.ajax({
              type: 'POST',
              url: '/saveAsConfig',
              data: data,
              success: success,
              dataType: 'json',
              contentType: "application/json; charset=utf-8"
            });
        };

        /* 
         * 保存config          
         */
        var saveConfig = function(config_name_t){
            
            var data = {};
            data.name = config_name_t;
            data.cols_show_name = [];

            var cols = $('.main th');
            //记录显示的列
            for(var i=1; i<cols.length/2; i++){             
                data.cols_show_name.push($(cols[i]).text());
            }            

            //必须把它转为字符串
            data = JSON.stringify(data);

            var success = function(data, ts){
                console.log(data.message);
            }
            
            $.ajax({
              type: 'POST',
              url: '/saveConfig',
              data: data,
              success: success,
              dataType: 'json',
              contentType: "application/json; charset=utf-8"
            });
        };

        /* 
         * 给snapshot operate添加html          
         */
        var operateFormatter = function(value, row, index){
            return [                
                '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                    '<i class="glyphicon glyphicon-remove"></i>',
                '</a>'
            ].join('');
        };

        /* 
         * 给selector table添加html          
         */
        var addHtml = function(value, row, index){
            return [                
                '<button type="button" class="btn btn-info btn-sm add_record">ADD</button>',                    
            ].join('');                    
        };

        /* 
         * 给snapshot table remove事件          
         */
        window.operateEvents = {
            'click .remove': function (e, value, row, index) {
                //删除config中的reqstr
                var data = {};
                data.reqstr = row.RequestString;
                data.config_name = config_name;

                var success = function(data){
                    console.log(data.message);
                    $('#snapshot tr[data-index='+index+']').remove();
                }

                $.ajax({
                  type: 'GET',
                  url: '/delReqStr',
                  data: data,
                  success: success,
                  dataType: 'text'
                });
            }
        };

        /* 
         * 给selector table add事件          
         */
        window.addEvent = {
            'click .add_record': function (e, value, row, index) { 

                var data = {};
                data.config_name = config_name;
                data.reqstr = row.reqstr;
                data.id = index;
                var success = function(data){
                    console.log(data.message);
                }

                $.ajax({
                  type: 'POST',
                  url: '/addReqStr',
                  data: data,
                  success: success,
                  dataType: 'json',
                });
            }
        };

        /* 
         * 给save事件          
         */
        $('#save').click(function(e){

            saveConfig(config_name);

        });

        /* 
         * 给saveas事件          
         */
        $('#saveas').click(function(e){

            $('#dialog_save').dialog("open");

        });

        /* 
         * save对话框          
         */
        $('#dialog_save').dialog({
            autoOpen: false,
            height: 300,
            width: 350,
            modal: true,
            open:function(){
                $(this).bind("keypress.ui-dialog", function(event){
                  if(event.keyCode == $.ui.keyCode.ENTER){
                    return false;
                  }
                });
            },
            buttons:{
                '确定': function(){

                    //检查一下名字是否重复
                    var config_names = $('#config td');
                    var sign = 0;
                    for(var i=0; i<config_names.length; i++){
                        if($(config_names[i]).text() == $('#config_name').val()){
                            sign = 1;
                        }                           
                    }
                    if(sign == 0){
                        //不重复
                        saveAsConfig(config_name, $('#config_name').val());
                        $( this ).dialog( "close" );
                    }else{
                        alert('配置文件名重复');
                    }

                },
                '取消':function(){
                    $( this ).dialog( "close" );
                }
            },
            close: function(){
            }
        });

        /* 
         * queryParams          
         */
         var queryParams = function(params){
            console.log('config_name:'+config_name);
            params.searchText = config_name;
            return params;
         }

        /* 
         * snapshot数据返回后，加载前的处理函数。因为会destroy table再build，引用2次，所以单独写出来          
         */
        var responseHandler = function(res) { 

            console.log('responseHandler configname:'+config_name);

            var result = [];            
            main.curve_name = res.curve_name;

            result = res.result_array;                
            
            if(columns_g.sort().toString() == res.columns.sort().toString()){
                //两个数组相同               

                setTimeout(function(){
                 $('#snapshot').bootstrapTable('refresh', {
                     silent: true,
                        url: '/getSnapShot'
                    });
                }, 3*interval_time);

                return result;                

            }else{
                //两个数组不同   
                //重建表
                // if(result.length != 0){
                    buildTable(res.show, res.columns, result); 
                // }
                switch_config = 0;  
                return false;                   
            }         
        }

        /* 
         * 新建table:列有变化，则需新建表         
         */
        var buildTable = function(show, all_column, res) {
            var i, j, row,
                columns = [],
                data = [];
            columns.push({
                field: 'operate',
                title: 'Item Operate',
                formatter: operateFormatter,
                events: operateEvents,
                switchable: false,
                class: 'col-md-1'
            });

            if(switch_config == 0){

                //没有切换config
                //snapshot中show的columns         
                var snapshot_columns_show = [];
                var cols = $('.main th');
                //记录显示的列
                for(var i=1; i<cols.length/2; i++){             
                    snapshot_columns_show.push($(cols[i]).text());
                }
                
                //all_column(这次返回的);snapshot_columns_show(上次返回的);all_column中有，snapshot_columns_show中没有，则visible=false
                for (i = 0; i < all_column.length; i++) {

                    //RequestString一直显示
                    if(all_column[i] == 'RequestString'){

                        columns.push({
                            field: all_column[i],
                            title: all_column[i],
                            switchable: true,
                            sortable: true,
                            visible: true
                        });

                    }else{

                        //不是RequestString
                        var sign = 0;

                        for(var j=0; j<snapshot_columns_show.length; j++){
                            if(snapshot_columns_show[j] == all_column[i]){
                                sign = 1;
                            }
                        }
                        if(sign == 0){
                            columns.push({
                                field: all_column[i],
                                title: all_column[i],
                                switchable: true,
                                sortable: true,
                                visible: false
                            });
                        }else{
                            columns.push({
                                field: all_column[i],
                                title: all_column[i],
                                switchable: true,
                                sortable: true
                            });    
                        }

                    }   //不是RequestString end

                }

            }else{

                //切换了config
                for (i = 0; i < all_column.length; i++) { 

                    //RequestString一直显示
                    if(all_column[i] == 'RequestString'){

                        columns.push({
                            field: all_column[i],
                            title: all_column[i],
                            switchable: true,
                            sortable: true,
                            visible: true
                        });

                    }else{

                        //不是RequestString
                        columns.push({
                            field: all_column[i],
                            title: all_column[i],
                            switchable: true,
                            sortable: true,
                            visible: show[i]
                        });

                    } //不是RequestString end

                }   // for end

            }   //else end          

            columns_g = all_column;

            $('#snapshot').bootstrapTable('destroy');

            newSnapshotTable(columns);

            //anspshot table
            $('#snapshot').bootstrapTable({                
                cache: false,
                height: 400,
                striped: true,
                sortName: "RequestString",
                sortOrder: 'desc',
                showColumns: true,
                columns: columns,
                data: res,
                //返回的数据，加载之前进行的预处理
                responseHandler: responseHandler,               
                queryParams: queryParams
            });            
        }       

        /* 
         * new snapshot table          
         */
         var newSnapshotTable = function(columns){
            //snapshot table
            $('#snapshot').bootstrapTable({
                method: 'get',
                url: '/getSnapShot',
                cache: false,
                height: 400,
                striped: true,
                sortName: "RequestString",
                sortOrder: 'desc',
                showColumns: true,
                columns: columns,
                //返回的数据，加载之前进行的预处理：去掉red中被删除的行
                responseHandler: responseHandler,                 
                queryParams: queryParams
            });            
         }

        /* 
         * 启动三个table          
         */
		var startBootstrapTable = function(){

			//config table
            $('#config').bootstrapTable({
                method: 'get',
                url: '/getConfigName',
                cache: false, 
                height: 382,               
                columns: [{
                    field: 'configname',
                    title: 'Config'                                     
                }]                
            })         
            .on('click-row.bs.table', function (e, row, $element) {
                // 点击配置文件的名字，显示不同的snapshot
                console.log('调取配置文件: ' + JSON.stringify(row));
                $('.snapshot_caption').text(row.configname);
                switch_config = 1;
                config_name = row.configname;
                columns_g = [];
            });

            //selector table
            $('#selector').bootstrapTable({
                method: 'get',
                url: '/selector',
                cache: false, 
                height: 382,
                dataType: 'json',               
                columns: [{
                    field: 'id',
                    title: 'ID',  
                    class: 'col-md-1',
                    width: 25
                }, {
                    field: 'reqstr',
                    title: 'ReqStr'                    
                }, {
                    field: 'add',
                    title: 'Add',
                    formatter: addHtml,
                    events: addEvent,                   
                }]                
            })
            //监听load-success.bs.table 事件
            .on('load-success.bs.table', function(){                
                setTimeout(function(){
                 $('#selector').bootstrapTable('refresh', {
                    silent: true,
                    url: '/selector'
                });
                }, 5*interval_time);         
            });  

            var columns = [
                {
                    field: 'RequestString',
                    title: 'RequestString',                   
                    switchable: true,
                    sortable: true,
                    visible: true
                }
                ];          

            newSnapshotTable(columns);

		};

        //程序的入口
        var start = function(){             
            
            startBootstrapTable();
            
        };	

		return {
			start : start
		}
	})();

	//程序的开始
	monitor.start();	
})