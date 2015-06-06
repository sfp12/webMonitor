nodejs+express+redis+bootstrap table+jquery UI

20150128
表格做好。
难点：
1、	对于删除的记录，add之后，去掉del数组内相应的index，使之可以显示出来
难的原因：selector data-index 与 snapshot data-index在经过一些add，del，add之后，两者的顺序对不上。需要手工建立两者间的对应关系。
方法：
1.	在index.js 中，/getsnapshot res 前，根据snapshot_lines中的key，对res进行排序（现在没有必要，当时是想尝试用这种办法解决。它可以解决顺序混乱的问题，但是不能解决缺少记录的问题）
2.	在index.js中，/getsnapshot res 中，加入了index=snapshot_lines.Key(0); responseHandler中，给selector_to_snapshot[‘index’+res.index] = i;  addevent时，del_index_obj['index'+selector_to_snapshot['index'+index]] = undefined;
2、	现在的效果有个问题，如果有新增列的话，所有的列都会显示。
难的原因：要比较上一次跟这一次res中的列，如果不同，需要做相应的操作，并把这次的列赋值给上次的列。会根据上一次的列显示snapshot中的列。So
方法：显示snapshot中的列，由另一个变量表示
1. buildTable中，由snapshot_columns_show表示显示的列。
3、snapshot table每次refresh时，需要看config中的columns跟上次的是否相同，如果不同的话，就需要destroy snapshot，再build new table，new table需要继续刷新，继续判断。使用的bootstrap table插件功能有限，有时需要自己补充。
