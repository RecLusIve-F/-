// ==UserScript==
// @name         杭电选课助手
// @icon         https://bkimg.cdn.bcebos.com/pic/7aec54e736d12f2e307562024fc2d56285356864?x-bce-process=image/resize,m_lfit,w_268,limit_1/format,f_jpg
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       RecLusIve_F
// @match        *://jxgl.hdu.edu.cn/*
// @require      https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/FileSaver@0.10.0/FileSaver.min.js
// @require      https://cdn.jsdelivr.net/npm/toastr@2.1.4/toastr.min.js
// @exclude      http://jxgl.hdu.edu.cn/CheckCode.aspx
// @resource     toastrCss https://cdn.bootcdn.net/ajax/libs/toastr.js/2.1.4/toastr.min.css
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==
(function() {
	'use strict';
	const $ = window.jQuery;
	const saveAs = window.saveAs;
	const toastr = window.toastr;
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"newestOnTop": false,
		"progressBar": false,
		"positionClass": "toast-top-center",
		"preventDuplicates": true,
		"onclick": null,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": "3000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
	GM_addStyle(GM_getResourceText('toastrCss'));
	$("#iframeautoheight").attr("sandbox",
		"allow-same-origin allow-top-navigation allow-forms allow-scripts allow-downloads");
	var ClassInfos = GM_getValue("ClassInfos", []);
	var isRunning = GM_getValue("isRunning", false);
	var isShow = GM_getValue("isShow", false);
	var taskID = GM_getValue("taskID", null);

	class ClassInfo {
		constructor(name, id, teacher, time, rest) {
			this.name = name;
			this.id = id;
			this.teacher = teacher;
			this.time = time;
			this.rest = rest;
		}
	}

	function insertSaveInfoBtn() {
		$("#Button2").after(`<input type="button" value="保存信息" id="saveBtn" class="button">`);
		$("#saveBtn").on("click", saveClassInfo);
	}

	function saveClassInfo() {
		let str_store = "";
		let tr = $("#kcmcGrid > tbody > tr");
		for (let i = 0; i < tr.length; i++) {
			let td = $(tr[i]).children("td");
			for (let j = 2; j < td.length - 1; j++) {
				str_store += $(td[j]).text().replace(/^\s+|\s+$/g, '') + " ";
			}
			str_store += $(td[td.length - 1]).text().replace(/^\s+|\s+$/g, '') + "\n";
		}
		//console.log(str_store);
		var blob = new Blob([str_store], {
			type: "text/plain;charset=utf-8"
		});
		saveAs(blob, "ClassInfo.txt");
	}

	function insertChooseComponent() {
		if ($("#xsyxxxk_form > div.main_box > div > div.footbox > em > span.footbutton > span > img").length != 0) {
			$("#xsyxxxk_form > div.main_box > div > div.footbox > em > span.footbutton > span > img").onload = rec();
		}
		if (isShow) {
			hideClass();
		}
		$("#xsyxxxk_form > div.toolbox > div:nth-child(5) > p.search_con").after(
			`<p class="search_con">输入需要选择的课程代码：<input type="text" id="ClassID" style="width:152px;" placeholder="必填">&nbsp教师：<input type="text" id="ClassTeacher" style="width:152px;" placeholder="选填">&nbsp时间：<input type="text" id="ClassTime" style="width:152px;" placeholder="必填">`
		);
		$("#xsyxxxk_form > div.toolbox > div:nth-child(5) > p:nth-child(2)").after(
			`<p class="search_con">仅显示已添加课程：<input type="checkbox" id="isShow">&nbsp&nbsp<input type="button" value="确定" id="addClassInfoBtn" class="button" style="width:56px;"><input type="button" value="清空" id="deleteBtn" class="button" style="width:56px;"><input type="button" value="开始抢课" id="startBtn" class="button" style="width:66px;"><input type="button" value="停止抢课" id="stopBtn" class="button" style="width:66px;"></p>`
		);
		$("#xsyxxxk_form > div.toolbox > div:nth-child(5) > p:nth-child(3)").after(
			`<p class="search_con" id="classInfo">已添加要选择课程名称为：</p>`
		);
		$("#addClassInfoBtn").on("click", handleClassInfos);
		$("#deleteBtn").on("click", deleteClassInfos);
		$("#isShow").attr("checked", isShow);
		$("#isShow").change(function() {
			isShow = !isShow
			GM_setValue("isShow", isShow);
			if (isShow) {
				hideClass();
			} else {
				window.location.reload();
			}
		});
		$("#startBtn").on("click", startToApply);
		$("#stopBtn").on("click", stopToApply);
		for (let i = 0; i < ClassInfos.length; i++) {
			$("#classInfo").append(ClassInfos[i].name + " ");
			chooseClass(ClassInfos[i].id, ClassInfos[i].time, ClassInfos[i].teacher, isShow);
		}
	}

	function handleClassInfos() {
		let id = $("#ClassID").val();
		let time = $("#ClassTime").val();
		let teacher = $("#ClassTeacher").val();
		if (id != '' && time != '') {
			$("#ClassID").val('');
			$("#ClassTime").val('');
			$("#ClassTeacher").val('');
			chooseClass(id, time, teacher, isShow);
		} else {
			toastr.error("课程代码和时间不能为空!");
		}
	}

	function deleteClassInfos() {
		GM_setValue("ClassInfos", []);
		ClassInfos = GM_getValue("ClassInfos", []);
		window.location.reload();
	}

	function chooseClass(id, time, teacher, isShow) {
		let tr = $("#kcmcGrid > tbody > tr");
		for (let i = 1; i < tr.length; i++) {
			let td = $(tr[i]).children("td");
			if ($(td[3]).text() == id && $(td[5]).text() == time && $(td[4]).text().includes(teacher)) {
				for (let j = 0; j < 2; j++) {
					if (!$(td[j]).children("input").is(':checked') && Number($(td[11]).text()) > 0) {
						$(td[j]).children("input").click();
						//console.log($(td[2]).text());
					}
					/*else if (Number($(td[11]).text()) <= 0){
					    toastr.info($(td[2]).children("a").text().replace("\n", '') + "的余量为" + $(td[11]).text());
					}*/
				}
				let temp_obj = new ClassInfo($(td[2]).children("a").text().replace("\n", ''), $(td[3]).text(), $(td[4]).text(), $(
					td[5]).text(), $(td[11]).text());
				var result = ClassInfos.some(item => {
					if (item.id == temp_obj.id && item.teacher == temp_obj.teacher) {
						item.rest = temp_obj.rest;
						return true;
					}
				});
				if (!result) {
					$("#classInfo").append(temp_obj.name + " ");
					ClassInfos.push(temp_obj);
				}
				GM_setValue("ClassInfos", ClassInfos);
			}
		}
	}

	function hideClass() {
		let tr = $("#kcmcGrid > tbody > tr");
		for (let i = 1; i < tr.length; i++) {
			let td = $(tr[i]).children("td");
			let result = false;
			ClassInfos.forEach(function(obj) {
				if (($(td[3]).text() == obj.id && $(td[5]).text() == obj.time && $(td[4]).text().includes(obj.teacher))) {
					result = true;
					return;
				}
			});
			if (!result) {
				$(tr[i]).hide();
			}
		}
	}

	function checkResult() {
		let tr = $("#DataGrid2 > tbody > tr");
		let isFinished = false;
		for (let i = 1; i < tr.length; i++) {
			let td = $(tr[i]).children("td");
			for (let j = 0; j < ClassInfos.length; j++) {
				if ($(td[0]).text() == ClassInfos[j].name && $(td[1]).text() == ClassInfos[j].teacher && $(td[6]).text() ==
					ClassInfos[j].time) {
					isFinished = true;
					var temp_obj = ClassInfos.splice(j, 1);
					toastr.success("<b>" + temp_obj.name + "已经抢到！</b>");
					GM_setValue("ClassInfos", ClassInfos);
					break;
				}
			}
		}
		if (isFinished) {
			window.location.reload();
		}
	}

	function startToApply() {
		checkResult();
		if (ClassInfos.length == 0) {
			isRunning = false;
			GM_setValue("isRunning", isRunning);
			clearTimeout(GM_getValue("taskID", null));
			GM_setValue("taskID", null);
			toastr.error("<b>选择课程为空！</b>");
		} else {
			toastr.success("<b>正在抢课.....</b>");
			GM_setValue("isRunning", true);
			GM_setValue("taskID", setTimeout(apply, 5000));
		}
	}

	function stopToApply() {
		isRunning = false;
		GM_setValue("isRunning", false);
		clearTimeout(GM_getValue("taskID", null));
		GM_setValue("taskID", null);
		toastr.warning("<b>停止抢课.....</b>");
	}

	function apply() {
		$("#Button1").click();
		startToApply();
	}

	function rec() {
		var image = document.querySelector(
			"#xsyxxxk_form > div.main_box > div > div.footbox > em > span.footbutton > span > img");
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext("2d");
		var numbers = ["110001110000000001100001110000111000011100001110000111000011100001110010000011100001",
			"111101111100111000011000001100100111110001111000111100111110011111001111100111110011",
			"110000100000000011100001110011111001111000111000111000111000111000111100000000000000",
			"110000100000010011000111100111100011100001111100011111000011100001100000000011100011",
			"111100111100011110001110000111000011001001001100100110010000000000000011110011111001",
			"100000010000001001111100111110000010000000001110011111000011100000110010000001100001",
			"110000110000000011100001111100100010000000001110000111000011100000110010000001100001",
			"000000000000001111100111100111100111110011110001111001111100111100011110011111001111",
			"110001110000000001100001110000010001000001100000100111000011100001110000000001100011"
		];
		var captcha = "";
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0);
		for (var i = 0; i < 5; i++) {
			var pixels = ctx.getImageData(9 * i + 6, 5, 7, 12).data;
			var ldString = "";
			for (var j = 0, length = pixels.length; j < length; j += 4) {
				ldString = ldString + (+(pixels[j] * 0.3 + pixels[j + 1] * 0.59 + pixels[j + 2] * 0.11 >= 140));
			}
			var comms = numbers.map(function(value) {
				return ldString.split("").filter(function(v, index) {
					return value[index] === v
				}).length
			});
			captcha += comms.indexOf(Math.max.apply(null, comms));
		}
		$("#txtYz").val(captcha);
	}

    if ($("#xsyxxxk_form > div.toolbox > div:nth-child(3)").length != 0) {
        insertChooseComponent();

        if (isRunning) {
            startToApply();
        }
    } else {
        let ID = GM_getValue("taskID", null);
        let isR = GM_getValue("isRunning", false);
        if (isR) {
            GM_setValue("taskID", null);
            GM_setValue("isRunning", false);
        }
    }
})();
