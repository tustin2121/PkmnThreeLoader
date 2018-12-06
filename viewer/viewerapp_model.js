// viewerapp_model.js
//
/* global $, window, document, ViewerApp, hljs, SPICA, THREE */

Object.assign(ViewerApp.prototype, {
	
	///////////////////////////////////////////////////////////////////////////
	// Model Tab
	
	init_modelTab() {
		let self = this;
		$(`#props input[debugVis]`).on('click', function(){
			let node = self.debugNodes[$(this).attr('debugVis')];
			if (node) node.visible = $(this).is(':checked');
		});
		
		$('#props input[name=doptAxis]').on('click', function(){
			this.scene.getObjectByName('AxisHelper').visible = $(this).is(':checked');
		});
		$('#props input[name=poptColor]').on('click', function(){
			self.displayPokemonModel();
		});
		
		$('#props button[name=moptCenterGeom]').on('click', function(){
			let bbox;
			root.traverse((m)=>{
				if (!m.isMesh) return;
				if (!bbox) {
					bbox = new THREE.Box3();
					bbox.setFromObject(m);
				} else {
					bbox.expandByObject(m);
				}
			});
			if (!bbox) return;
			let trans = new THREE.Vector3();
			bbox.getCenter(trans);
			root.traverse(m=>{
				if (!m.isMesh) return;
				if (!m.geometry) return;
				m.geometry.translate(-trans.x, 0, -trans.z);
			});
		});
	},
	
	populate_modelTab(info) {
		let isMon = info.isPokemon;
		
		$('#pokemonDisplayOpts').toggle(isMon);
		$('#modelList').toggle(!isMon);
		$('#pokemonDisplayOpts input').prop('disabled', !isMon);
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Texture Tab
	
	populate_textureTab(info) {
		for (let [i, val] of info.texpak.entries()){
			$(`#texList${i}`).empty().hide();
			if (!val || !Object.keys(val).length) continue;
			let $p = $(`#texList${i}`).show();
			for (let [name, texInfo] of Object.entries(val)) {
				let $t = $(`<li>${texInfo.tex.name}</li>`).appendTo($p);
				$t.on('dblclick', ()=>{
					this.displayTexture(texInfo);
					texInfo.tex.decodeData().then(x=>{
						texInfo.repaint();
					});
				});
			}
		}
	},
	
	displayTexture(texInfo) {
		$('#view > canvas').hide();
		$('#textureView').show().empty().append(texInfo.$canvas);
		$('#textureView').attr('info', texInfo.tex.getInfoString());
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Skeleton Tab
	
	populate_boneTab(info) {
		$('#boneList').empty();
		for (let bone of info.bones) {
			let $t = $(`<li>${bone.name}</li>`).appendTo('#boneList');
			let $u = $(`<span class='pos'></span>`).appendTo($t);
			this.updateFns.push(()=>$u.text(`(${bone.position.x.toFixed(0)},${bone.position.y.toFixed(0)},${bone.position.z.toFixed(0)})`));
		}
		if (info.bones.length) $('#pokemonDisplayOpts [name=poptSkeleton]').prop('disabled', false);
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Shaders Tab
	
	init_shaderTab() {
		hljs.configure({
			// tabReplace: '<span class="tab">\t</span>',
		});
	},
	
	populate_shadersTab(info) {
		
	},
	
	displayShader(code, errorLog) {
		code = code.split('\n');
		let $d = $('<div>');
		for (let line of code) {
			// console.log('Line: '+line);
			let $line = $('<line>');
			line = hljs.highlight('GLSL', line).value;
			line = line.replace(/\t/g, '<span class="hljs-tab">&nbsp;</span>');
			if (line === '') line = '&nbsp';
			// console.log('Out: '+line);
			$line.html(line).appendTo($d);
		}
		
		if (errorLog) {
			let res = /^ERROR: (\d+):(\d+):/i.exec(errorLog);
			let row = res[2];
			let $err = $('<error>').text(errorLog).attr('locx', res[1]);
			$d.find(`line:nth-child(${row})`).after($err);
		}
		
		$('#view > canvas').hide();
		$('#shaderView').show().empty().append($d);
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Animation Tab
	
	init_animTab() {
		$('#animStop').on('dblclick', ()=> this.playAnimation() );
	},
	
	populate_animTab(info) {
		let animHashes = new Map();
		for (let [i, pak] of info.animpak.entries()) {
			$(`#animList${i}`).empty().hide();
			if (!pak) continue;
			let { a } = pak;
			if (a && a.length) {
				let $p = $(`#animList${i}`).show();
				for (let [num, animInfo] of Object.entries(a)) {
					if (!animInfo.clip) {
						animInfo.clip = animInfo.anim.toThree();
						animInfo.hash = animInfo.anim.calcAnimHash();
					}
					
					let $t = $(`<li slot="${num}">${animInfo.anim.name || '[unnamed_'+i+':'+num+']'}</li>`).appendTo($p);
					if (animHashes.has(animInfo.hash)) {
						$t.append(`<span class="dup">dup of '${animHashes.get(animInfo.hash)}'</span>`);
					} else {
						animHashes.set(animInfo.hash, animInfo.anim.name);
					}
					$t.on('dblclick', ()=>{
						this.playAnimation(animInfo);
					});
				}
			}
		}
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Extra Animation Tab
	
	populate_xanimTab(info) {
		let self = this;
		$('#sec-xanims > div').hide();
		let expressionAnims = this.expressionAnims = [];
		for (let [i, pak] of info.animpak.entries()) {
			if (!pak) continue;
			let { x } = pak;
			if (!x || !x.length) continue;
			for (let num = 0; num < x.length; num++) {
				let xanim = x[num];
				if (!xanim) {
					$(`#xanimExp${num}`).empty();
					continue;
				}
				if (xanim.toThree) {
					x[num] = xanim = xanim.toThree();
				}
				switch (num) {
					case 1: // Eye expressions
					case 2: 
					case 3: 
						_eyeExpressionBlock(num, xanim);
						break;
					case 4: // Mouth expressions
					case 5: 
					case 6: 
						_mouthExpressionBlock(num, xanim);
						break;
					case 7:
						_constantMotionBlock(num, xanim);
						break;
					case 11:
						_extraPoints(num, xanim);
						break;
				}
			}
			$('#xanimPresets').show();
			$('#xanimPresets [name=preExp]').on('click', function(e) {
				let vals = $(this).val().split('-');
				
				$(`#sec-xanims input[name=eye1][value=${vals[0]*10}]`).click();
				$(`#sec-xanims input[name=eye2][value=${vals[0]*10}]`).click();
				$(`#sec-xanims input[name=eye3][value=${vals[0]*10}]`).click();
				$(`#sec-xanims input[name=mouth4][value=${vals[1]*10}]`).click();
				$(`#sec-xanims input[name=mouth5][value=${vals[1]*10}]`).click();
				$(`#sec-xanims input[name=mouth6][value=${vals[1]*10}]`).click();
			});
		}
		return;
		
		function _eyeExpressionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = self.animMixer.clipAction(anim);
			expressionAnims[num].reset().play();
			expressionAnims[num].paused = true;
			expressionAnims[num].enabled = false;
			let $div = $(`#xanimExp${num}`).empty().show();
			$div.append(`<label><input name="eye${num}" type="radio" value="0" checked/> [Off]</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="5"/> Neutral</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="15"/> Half-Blink</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="25"/> Blink</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="35"/> Pained</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="45"/> Determined</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="55"/> Pleased</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="65"/> Sad</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="75"/> Crossed</label>`);
			$div.find(`input[name=eye${num}]`).on('click', function(e) {
				expressionAnims[num].time = (parseInt($(this).val(),10)) / 30;
				expressionAnims[num].enabled = (expressionAnims[num].time > 0);
			});
		}
		function _mouthExpressionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = self.animMixer.clipAction(anim);
			expressionAnims[num].reset().play();
			expressionAnims[num].paused = true;
			expressionAnims[num].enabled = false;
			let $div = $(`#xanimExp${num}`).empty().show();
			$div.append(`<label><input name="mouth${num}" type="radio" value="0" checked/> [Off]</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="5"/> Neutral</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="15"/> Half-Open</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="25"/> Open</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="35"/> Chew</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="45"/> Bite</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="55"/> Sad</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="65"/> [Unsupported]</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="75"/> [Unsupported]</label>`);
			$div.find(`input[name=mouth${num}]`).on('click', function(e) {
				expressionAnims[num].time = (parseInt($(this).val(),10)) / 30;
				expressionAnims[num].enabled = (expressionAnims[num].time > 0);
			});
		}
		function _constantMotionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = self.animMixer.clipAction(anim);
			$(`#xanimConst`).show();
			$(`#xanimConst [name=xanimRunConst]`).on('click', function(e){
				let b = $(this).is(':checked');
				if (b) {
					expressionAnims[num].enabled = true;
					expressionAnims[num].reset().play();
				} else {
					expressionAnims[num].enabled = false;
					expressionAnims[num].stop();
				}
			});
		}
		function _extraPoints(num, xanim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = [];
			let $div = $('#xanimInfo').empty().show();
			for (let i = 0; i < xanim.length; i++) {
				let row = xanim[i];
				let $t = $(`<li slot="${row.a}/${row.b}"><label><input type='checkbox'/> ${row.name}<span class="dup"></span></br>(${row.x.toFixed(2)},${row.y.toFixed(2)},${row.z.toFixed(2)})</label></li>`);
				switch (row.a) {
					case 0: $t.find('.dup').text(`Head Focus`); break;
					case 1: $t.find('.dup').text(`Top of Head`); break;
					case 2: $t.find('.dup').text(`Eye`); break;
					case 3: $t.find('.dup').text(`Mouth`); break;
					case 4: $t.find('.dup').text(`???`); break;
					case 5: $t.find('.dup').text(`Center of Mon`); break;
					case 6: $t.find('.dup').text(`Sp0 Beam Origin`); break;
					case 7: $t.find('.dup').text(`Hand Attach`); break;
					case 8: $t.find('.dup').text(`End of Tail`); break;
					case 9: $t.find('.dup').text(`Ground Contact`); break;
					case 10: $t.find('.dup').text(`Phys0 Contact`); break;
					case 11: $t.find('.dup').text(`Phys1 Contact`); break;
					case 12: $t.find('.dup').text(`Phys2 Contact(?)`); break;
					case 13: $t.find('.dup').text(`Phys3 Contact(?)`); break;
					case 14: $t.find('.dup').text(`Pokeball Hover`); break;
					case 15: $t.find('.dup').text(`Sp1 Origin`); break;
					case 16: $t.find('.dup').text(`Sp2 Origin`); break;
					case 17: $t.find('.dup').text(`Sp3 Origin`); break;
					case 18: $t.find('.dup').text(`???`); break;
					default: $t.find('.dup').text(`[Unknown]`); break;
				}
				let bone = (()=>{
					for (let b of info.bones) {
						if (b.name === row.name) return b;
					}
					return null;
				})();
				if (bone) {
					let point = new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshBasicMaterial());
					point.renderOrder = 100;
					point.position.set(row.x, row.y, row.z);
					point.visible = false;
					point.material.depthTest = false;
					bone.add(point);
					
					expressionAnims[num][i] = point;
					$t.find('input').on('click', function(e){
						expressionAnims[num][i].visible = $(this).is(':checked');
					});
				} else {
					$t.find('input').prop('disabled', true);
				}
				$t.appendTo($div);
			}
		}
	},
	
	///////////////////////////////////////////////////////////////////////////
	// Metadata Tab
	
	populate_metaTab(info) {
		let { meta1, meta2 } = info.metadata;
		if (meta1) {
			$('#metaList1 [name=meta1_01]').val(meta1.unk01);
			$('#metaList1 [name=meta1_02]').val(meta1.unk02);
			$('#metaList1 [name=meta1_03]').val(meta1.unk03);
			$('#metaList1 [name=meta1_04]').val(meta1.cameraLevel);
			$('#metaList1 [name=meta1_05]').val(meta1.boundingBoxMin);
			$('#metaList1 [name=meta1_06]').val(meta1.boundingBoxMax);
			$('#metaList1 [name=meta1_07]').val(meta1.unk07);
			$('#metaList1 [name=meta1_08]').val(meta1.unk08);
			$('#metaList1 [name=meta1_09]').val(meta1.unk09);
			$('#metaList1 [name=meta1_10]').val(meta1.unk10);
			$('#metaList1 [name=meta1_11]').val(meta1.unk11);
			for (let i = 0; i < meta1.unk12.length; i++) {
				$(`#metaList1 [name=meta1_field${i.toString(16)}]`).prop('checked', meta1.unk12[i] !== 0);
				$(`#metaList1 [name=meta1_field${i.toString(16)}]`).prop('indeterminate', meta1.unk12[i] !== 0 && meta1.unk12[i] !== 1);
			}
		}
		if (meta2) {
			for (let i = 0; i < meta2.length; i++) {
				//TODO
			}
		}
	},
});