# In-the-wild clips — what each one is

Written by `.dev/tools/build_in_the_wild.py`. Do not edit by hand; re-run the
script instead. `manifest.json` beside this file is the same data for a
machine.

Every clip is a 2064x1048 mosaic of eight panels in three
zones, read left to right the way the method runs: the source video, the six
generated views as one block, the 4DGS reconstruction — one file, so the
eight share a decode clock; the script's header says why that matters. The
title band, zones' rounded corners and flow arrows are baked
(`.dev/tools/mosaic-chrome.png`) so the file carries its own reading when
shared. The titles use the page's local Lato 400 face, colours and tracking.
The generated panels are pre-sharpened (CAS 0.4)
before compositing; the source panel is not — it arrived platform-sharpened
already. `view` decides what ships: 360° shows the full orbit (`render_4dgs`)
over an even ring of cameras, 180° the front arc (`render_4dgs_front`) over
front cameras; both are labelled 4DGS Rendering in the file.

Beside each mosaic sits `clip-<hash>-pill.mp4`: the source video alone at
thumbnail size, silent, which the page loops inside the clip's pill under
the pointer and, for the selected clip, keeps looping. Its first frame is
the pill's own still, so playback starts invisibly.

`fps` is the scene's own rate, not a house rate: the report carries a mix and
the mosaic is built at whatever the scene came in at. `audio` is the source
panel's track, carried through where there is one. The page autoplays muted,
so it is only ever heard by a reader who reaches for the volume control.

## Where these came from

- `/Users/jyd/outputs/fdlp/spascene/reports/20260717_fdao_stage2_sapiens2_tgt6src1frm25_rcp_dropout/epoch01-step003000/gvhmr/sapiens2/cam1to6to24/dense`

174 of 410 sequences, the ones rated excellent on either orbit. Selection, categories, within-category ordering and view
are the report's `ratings.json` — manual curation, never re-derived. The
page's `TRAILING_CATEGORY_IDS` only moves Robot's tab to the right edge.
A ★ marks membership of Featured, the sheet's default tab; those clips
also sit in their own category.

Clips sourced from video platforms are third-party material shown as research
results; `platform` below is what each came from.

| clip | platform | scene | view | fps | audio | full | front | category |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| clip-7a76c49254 | douyin | `douyin/wayouli/7565494657385139505-seg000_30fps_start0350end0471` | 360° | 30 | yes | 优 | 良 | ★ music_stage |
| clip-e6293bcfa7 | douyin | `douyin/wusan/7671567288083991860-seg000_30fps_start0127end0248` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-cc7cf52003 | youtube | `youtube/brucelee/NlTyJhbTxxo-seg000_24fps_start0950end1071` | 180° | 24 | yes | 良 | 优 | ★ sports_action |
| clip-c0bd5b6cfc | youtube | `youtube/spiderman/x7yWprgWF_4-seg000_24fps_start3229end3350` | 360° | 24 | yes | 优 | 良 | ★ character_cinematic |
| clip-affbe73935 | rednote | `rednote/aria_lina/6a1eaec0000000002202355e-seg000_30fps_start0071end0192` | 360° | 30 | yes | 优 | 良 | ★ character_cinematic |
| clip-7daed83dc2 | douyin | `douyin/aria_lina/7658697384268798180-seg000_30fps_start0086end0207` | 180° | 30 | yes | 良 | 优 | ★ character_cinematic |
| clip-8971372c26 | douyin | `douyin/shashengyuwan/7656371718100902842-seg000_30fps_start0000end0121` | 180° | 30 | yes | 良 | 优 | ★ character_cinematic |
| clip-fe6797e79f | douyin | `douyin/jabbawockeez/7665963470898187570-seg000_30fps_start0248end0369` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-66de535122 | douyin | `douyin/xiaoshua/7651425137899752755-seg000_30fps_start0150end0271` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-760197f096 | douyin | `douyin/marquesescott/7624510146537868559-seg000_30fps_start0202end0323` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-09e8722e34 | douyin | `douyin/xiaoshua/7637519551348870451-seg000_30fps_start0000end0121` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-85e3354d60 | rednote | `rednote/xiaoshua/6a1eae1b0000000006030c59-seg000_30fps_start0214end0335` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-4b6d4be5b0 | douyin | `douyin/wujiaru/7666657019839568561-seg000_30fps_start0000end0121` | 180° | 30 | yes | 良 | 优 | ★ character_cinematic |
| clip-d5e20cce12 | douyin | `douyin/gera/7624802455012703898-seg000_30fps_start0128end0249` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-2a1e0d40bf | douyin | `douyin/liangbo/7614382876251831781-seg000_30fps_start0196end0317` | 360° | 30 | yes | 优 | 良 | ★ music_stage |
| clip-4fb6188b41 | rednote | `rednote/xiaoshua/663a2fb0000000001e02f816-seg000_30fps_start0054end0175` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-76da8ee8ac | douyin | `douyin/wusan/7671196078925991208-seg000_30fps_start0550end0671` | 360° | 30 | yes | 优 | 良 | ★ dance_choreography |
| clip-587c26d749 | douyin | `douyin/xiaoxiaoxiaozhao/7208115279887437093-seg000_30fps_start0323end0444` | 360° | 30 | yes | 优 | 良 | ★ fashion_lifestyle |
| clip-0a22374d33 | rednote | `rednote/karina/682a34b8000000002100ef62-seg000_30fps_start0833end0954` | 360° | 30 | yes | 差 | 优 | ★ music_stage |
| clip-e7c6b11412 | douyin | `douyin/tianyiming/7661857557724179688-seg000_25fps_start0056end0177` | 360° | 25 | yes | 优 | 良 | ★ dance_choreography |
| clip-e6f4f69107 | douyin | `douyin/karina/7460451494530125093-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | ★ dance_choreography |
| clip-0169794514 | douyin | `douyin/yoona/7587354895821720875-seg001_30fps_start0560end0681` | 180° | 30 | yes | 良 | 优 | ★ dance_choreography |
| clip-658616a727 | youtube | `youtube/joker/c0EyFBPPuuY-seg000_24fps_start0710end0831` | 180° | 24 | yes | 良 | 优 | ★ character_cinematic |
| clip-6486e99aa1 | seedance | `seedance/steve_jobs_timeislimited1` | 180° | 24 | yes | 良 | 优 | ★ speech_presentation |
| clip-b32f80bd9f | youtube | `youtube/samaltman/U9mJuUkhUzk-seg000_30fps_start15848end15969` | 360° | 30 | yes | 优 | 良 | ★ speech_presentation |
| clip-b3aa4f8f72 | youtube | `youtube/feifeili/y8NtMZ7VGmU-seg000_24fps_start2065end2186` | 360° | 24 | yes | 良 | 优 | ★ speech_presentation |
| clip-311913036b | youtube | `youtube/jensenhuang/11Y3B33oCLE-seg000_30fps_start0863end0984` | 360° | 30 | yes | 优 | 良 | ★ speech_presentation |
| clip-e6497cad94 | douyin | `douyin/conormcgregor/7660365908967214363-seg001_30fps_start0675end0796` | 360° | 30 | yes | 优 | 良 | ★ sports_action |
| clip-68aa5db14b | douyin | `douyin/tatsurotaira/7636966032535538959-seg001_30fps_start0240end0361` | 180° | 30 | yes | 良 | 优 | ★ sports_action |
| clip-9afa0971f4 | douyin | `douyin/zhangweili/7572019396625960219-seg000_30fps_start0850end0971` | 180° | 30 | yes | 良 | 优 | ★ sports_action |
| clip-ef306fc0ea | douyin | `douyin/songyadong/7598015155229691190-seg000_30fps_start0505end0626` | 360° | 30 | yes | 良 | 优 | ★ sports_action |
| clip-74cf65ecec | youtube | `youtube/chris/bb_chris3-seg000_30fps_start0000end0121` | 180° | 30 | — | 良 | 优 | ★ sports_action |
| clip-b86e7299cf | seedance | `seedance/kevin_durant_0` | 360° | 24 | yes | 优 | 良 | ★ sports_action |
| clip-eabb8951b4 | douyin | `douyin/mumuchuanshan/7533204585377320244-seg000_30fps_start0000end0121` | 360° | 30 | yes | 优 | 良 | ★ character_cinematic |
| clip-e02d1eb275 | douyin | `douyin/yuanzhi/7667390368371793137-seg001_25fps_start0463end0584` | 360° | 25 | yes | 良 | 优 | ★ sports_action |
| clip-008e703222 | pexels | `pexels/6980035-uhd_2160_4096_30fps-seg000_30fps_start0000end0121` | 360° | 30 | — | 优 | 良 | ★ dance_choreography |
| clip-2d7bd4f24a | pexels | `pexels/10331522-uhd_2160_4096_25fps-seg000_25fps_start0074end0195` | 360° | 25 | — | 良 | 优 | ★ fashion_lifestyle |
| clip-447050bc1d | youtube | `youtube/joker/joker_interview-seg000_30fps_start0000end0121` | 360° | 30 | — | 优 | 良 | ★ character_cinematic |
| clip-bb37a712c3 | douyin | `douyin/engineait800/7661654915231858161-seg000_30fps_start0063end0184` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-2c693afb32 | douyin | `douyin/optimus/7504136084041780492-seg001_30fps_start0714end0835` | 360° | 30 | yes | 良 | 优 | ★ robot |
| clip-b03ab4a16e | douyin | `douyin/unitree/7541313645260311865-seg000_30fps_start0069end0190` | 180° | 30 | yes | 良 | 优 | ★ robot |
| clip-10266a20f9 | douyin | `douyin/robotamu/7644650220941032314-seg000_30fps_start0000end0121` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-10d7001964 | douyin | `douyin/unitree/7536849917004778778-seg000_30fps_start0350end0471` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-8b3cfbe12b | douyin | `douyin/humanoidrobot/7663410560184219826-seg000_30fps_start0230end0351` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-32b9aaa0ce | douyin | `douyin/xingjixiaomei/7370679330352958783-seg000_30fps_start0020end0141` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-0a5226742c | douyin | `douyin/unitree/7657407585309429043-seg000_30fps_start0005end0126` | 360° | 30 | yes | 优 | 良 | ★ robot |
| clip-b061c86675 | douyin | `douyin/xiaoshua/7641466975574576427-seg000_30fps_start0212end0333` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-6ee1f8f343 | douyin | `douyin/xiaoshua/7647518334447013156-seg000_30fps_start0095end0216` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-206500d996 | douyin | `douyin/wusan/7670083094984117555-seg000_30fps_start0135end0256` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-e83d41cc29 | douyin | `douyin/xiaoshua/7658962546694556962-seg000_30fps_start0487end0608` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-7a41476188 | douyin | `douyin/xiaoshua/7651628792678468914-seg000_30fps_start0477end0598` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-c2f103b1ca | douyin | `douyin/gera/7547271413889273122-seg000_25fps_start0071end0192` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-b521a9dad7 | douyin | `douyin/gera/7336154232501914943-seg000_25fps_start0077end0198` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-6e23659314 | douyin | `douyin/wusan/7667114550994488602-seg000_30fps_start0152end0273` | 180° | 30 | yes | 良 | 优 | dance_choreography |
| clip-0c86a5a6cc | douyin | `douyin/wusan/7671567288083991860-seg001_30fps_start0253end0374` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-bddc628083 | douyin | `douyin/yoona/7587354895821720875-seg000_30fps_start0077end0198` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-2cee756e2d | douyin | `douyin/yuna/7671619032872948735-seg000_30fps_start0219end0340` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-79a0ffac23 | douyin | `douyin/kiki/7652044102390122661-seg000_30fps_start0020end0141` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-d7a67e1e61 | douyin | `douyin/yuqi/7397069394758749440-seg000_30fps_start3352end3473` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-537a400a44 | rednote | `rednote/yuqi/6a093bcc000000000702c27b-seg000_30fps_start0478end0599` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-fb922fc34b | bilibili | `bilibili/caixukun/BV1ct4y1n7t9-seg001_30fps_start0842end0963` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-6357aa640b | rednote | `rednote/chuanup/6835b668000000000f038e64-seg000_25fps_start0033end0154` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-aafe117eb7 | rednote | `rednote/chuanup/693c1bb6000000001b0226be-seg000_30fps_start0692end0813` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-99f6fe3553 | rednote | `rednote/chuanup/69fdecef000000003601e47c-seg000_25fps_start0093end0214` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-86a4f973bf | rednote | `rednote/chuanup/685176fb000000000303b80b-seg000_25fps_start0000end0121` | 360° | 25 | yes | 良 | 优 | dance_choreography |
| clip-b5516ba257 | rednote | `rednote/huanyi/6a4ce3a6000000001003e452-seg000_25fps_start0125end0246` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-4f26a08f3d | rednote | `rednote/huazeilei/6a5f530c000000000f02bb76-seg000_30fps_start0135end0256` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-a919c0067d | douyin | `douyin/luoyizhou/7597313802715241893-seg000_30fps_start0402end0523` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-0552144574 | bilibili | `bilibili/tianxinxin/BV14bq9BXE45-seg000_25fps_start0000end0121` | 360° | 25 | yes | 优 | 良 | dance_choreography |
| clip-64ff23433d | bilibili | `bilibili/tianxinxin/BV1JeUhB3E8j-seg000_25fps_start0535end0656` | 360° | 25 | yes | 良 | 优 | dance_choreography |
| clip-52d1815002 | bilibili | `bilibili/tianxinxin/BV1rABEBmEfF-seg000_25fps_start0347end0468` | 360° | 25 | yes | 良 | 优 | dance_choreography |
| clip-4dde5dd849 | bilibili | `bilibili/tianxinxin/BV1UGwszMEqQ-seg000_25fps_start0105end0226` | 360° | 25 | yes | 良 | 优 | dance_choreography |
| clip-42e1e673f5 | douyin | `douyin/yizhibeika/7636293416398468475-seg000_30fps_start0497end0618` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-3b455cd72e | douyin | `douyin/yizhibeika/7632309504318879987-seg000_30fps_start0083end0204` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-49e6da1870 | douyin | `douyin/xiatian/7663806118158573475-seg000_30fps_start0361end0482` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-cfb1a73821 | douyin | `douyin/sergejssinkins/7642666609622408548-seg000_30fps_start0408end0529` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-73f388887e | douyin | `douyin/zhangweili/7592916253800735418-seg000_30fps_start0058end0179` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-24dea5eb1f | douyin | `douyin/winter/7617015006534495955-seg000_30fps_start0208end0329` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-b108ff0a6f | rednote | `rednote/xiaoyang/6a155ba4000000000701115a-seg000_30fps_start0280end0401` | 360° | 30 | yes | 差 | 优 | dance_choreography |
| clip-f8d3896ad4 | rednote | `rednote/xiaoyang/6a2a75a600000000210096cb-seg000_30fps_start0123end0244` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-3845643025 | rednote | `rednote/xiaoyang/6a4242e30000000022014f9b-seg000_30fps_start0170end0291` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-b67ceca794 | douyin | `douyin/jinchen/7563162253399493927-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | dance_choreography |
| clip-16e2d9324a | douyin | `douyin/liujiaxi/7625932123564341876-seg000_30fps_start0020end0141` | 360° | 30 | yes | 差 | 优 | dance_choreography |
| clip-1c2e7e998e | douyin | `douyin/marquesescott/7680617651475593850-seg000_30fps_start0039end0160` | 360° | 30 | yes | 优 | 良 | dance_choreography |
| clip-484f0cff5c | pexels | `pexels/5390836-uhd_2160_4096_30fps-seg000_30fps_start0064end0185` | 360° | 30 | — | 优 | 良 | dance_choreography |
| clip-af27c84ef0 | pexels | `pexels/7017803-hd_1080_1920_30fps-seg000_30fps_start0104end0225` | 180° | 30 | — | 良 | 优 | dance_choreography |
| clip-bb13515216 | pexels | `pexels/7080903-hd_1080_1920_30fps-seg000_30fps_start0073end0194` | 360° | 30 | — | 优 | 良 | dance_choreography |
| clip-b4f7edc197 | pexels | `pexels/7480858-uhd_2160_3840_25fps-seg000_25fps_start0536end0657` | 360° | 25 | — | 优 | 良 | dance_choreography |
| clip-9b1ad228d2 | pexels | `pexels/8929382-hd_1080_1920_30fps-seg000_30fps_start0000end0121` | 360° | 30 | — | 优 | 良 | dance_choreography |
| clip-c09f0bffec | pexels | `pexels/7716891-uhd_2160_4096_25fps-seg000_25fps_start0609end0730` | 360° | 25 | — | 优 | 良 | dance_choreography |
| clip-a9ca9b6bca | pexels | `pexels/6003989-uhd_2160_3840_30fps-seg000_30fps_start0000end0121` | 360° | 30 | — | 良 | 优 | dance_choreography |
| clip-9dd95b9bda | pexels | `pexels/7341232-uhd_2160_3840_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 良 | 优 | dance_choreography |
| clip-b42bdb235d | pexels | `pexels/8027897-uhd_2160_3840_25fps-seg000_25fps_start0024end0145` | 360° | 25 | — | 良 | 优 | dance_choreography |
| clip-8628a94549 | pexels | `pexels/8628515-hd_1080_1920_25fps-seg000_25fps_start0125end0246` | 360° | 25 | — | 良 | 优 | dance_choreography |
| clip-883e3b999b | pexels | `pexels/5390224-uhd_2160_4096_30fps-seg000_30fps_start0000end0121` | 360° | 30 | — | 优 | 良 | dance_choreography |
| clip-8a7bf9280b | youtube | `youtube/spiderman/EgqyNam6bKg-seg000_30fps_start1103end1224` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-90125cb945 | youtube | `youtube/joker/jAgGqQDv32k-seg000_24fps_start5643end5764` | 360° | 24 | yes | 优 | 良 | character_cinematic |
| clip-19da8156f6 | douyin | `douyin/aria_lina/7655691801937355754-seg000_30fps_start0052end0173` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-8fe318e434 | rednote | `rednote/aria_lina/69a18d7b000000002602e9ec-seg000_30fps_start0123end0244` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-1189b4dffb | rednote | `rednote/aria_lina/6a1438c7000000003502e6f4-seg000_30fps_start0155end0276` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-f7c886b49e | douyin | `douyin/aria_lina/7656013226044581366-seg000_30fps_start0161end0282` | 360° | 30 | yes | 优 | 良 | character_cinematic |
| clip-6a566e6458 | douyin | `douyin/shiba/7656386927856310257-seg000_30fps_start0117end0238` | 180° | 30 | yes | 良 | 优 | character_cinematic |
| clip-c0c2017697 | douyin | `douyin/yuna/7667116298740958666-seg000_30fps_start0000end0121` | 180° | 30 | yes | 良 | 优 | character_cinematic |
| clip-94a7a2c307 | douyin | `douyin/weilingying/7418885795995520282-seg000_30fps_start0040end0161` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-640f3e8206 | youtube | `youtube/doctorstrange/9kLBkYoPs2o-seg000_30fps_start0543end0664` | 180° | 30 | yes | 良 | 优 | character_cinematic |
| clip-00e12c7292 | youtube | `youtube/doctorstrange/9kLBkYoPs2o-seg001_30fps_start3239end3360` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-5a445425f4 | douyin | `douyin/obito/7594863630706741130-seg000_30fps_start0164end0285` | 180° | 30 | yes | 良 | 优 | character_cinematic |
| clip-e3575402d9 | douyin | `douyin/xiaoyu/7662360780184726001-seg000_24fps_start0327end0448` | 360° | 24 | yes | 良 | 优 | character_cinematic |
| clip-4d84dfaec9 | youtube | `youtube/lotr/eFbWU6c6r58-seg000_24fps_start7492end7613` | 360° | 24 | yes | 良 | 优 | character_cinematic |
| clip-09a61aa528 | douyin | `douyin/jinxuanhuangyuan/7546206474381348155-seg000_30fps_start0060end0181` | 360° | 30 | yes | 良 | 优 | character_cinematic |
| clip-7777f26238 | pexels | `pexels/5435720-uhd_2160_4096_25fps-seg000_25fps_start0050end0171` | 360° | 25 | — | 优 | 良 | character_cinematic |
| clip-94634c0573 | pexels | `pexels/5385965-uhd_2160_4096_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | character_cinematic |
| clip-b6601d473d | pexels | `pexels/8160486-uhd_2160_3840_25fps-seg000_25fps_start0080end0201` | 360° | 25 | — | 良 | 优 | character_cinematic |
| clip-315b8b2fe8 | pexels | `pexels/8059623-hd_1080_1920_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | character_cinematic |
| clip-3f85d26590 | youtube | `youtube/lebronjames/AypwtYRhqS8-seg000_30fps_start1719end1840` | 180° | 30 | yes | 良 | 优 | sports_action |
| clip-87daca7507 | douyin | `douyin/kevindurant/7149191606640381199-seg000_30fps_start1625end1746` | 360° | 30 | yes | 良 | 优 | sports_action |
| clip-1c530f759d | douyin | `douyin/stephencurry/7285746562557283640-seg000_30fps_start0096end0217` | 180° | 30 | yes | 优 | 良 | sports_action |
| clip-a3143f89b6 | youtube | `youtube/brucelee/wUx71EHIVKY-seg000_24fps_start9391end9512` | 180° | 24 | yes | 良 | 优 | sports_action |
| clip-fd0b1393ec | douyin | `douyin/tatsurotaira/7636966032535538959-seg000_30fps_start0027end0148` | 180° | 30 | yes | 良 | 优 | sports_action |
| clip-6b46cdabbb | douyin | `douyin/songyadong/7598015155229691190-seg001_30fps_start0843end0964` | 360° | 30 | yes | 优 | 良 | sports_action |
| clip-d9317c4b07 | douyin | `douyin/kamaruusman/7663020569259986222-seg000_30fps_start0344end0465` | 360° | 30 | yes | 良 | 优 | sports_action |
| clip-424acf608b | douyin | `douyin/alexpereira/7398335215233404175-seg000_30fps_start0370end0491` | 360° | 30 | yes | 优 | 良 | sports_action |
| clip-132ab9a469 | douyin | `douyin/ufc/7437534701209799995-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | sports_action |
| clip-785bcec500 | douyin | `douyin/ufc/7437534701209799995-seg001_30fps_start0273end0394` | 180° | 30 | yes | 良 | 优 | sports_action |
| clip-533645bbda | youtube | `youtube/black_back/bb_black1-seg000_30fps_start0050end0171` | 360° | 30 | — | 良 | 优 | sports_action |
| clip-db8a8fdbbe | douyin | `douyin/xiaoyaoguagua/7666494467809004846-seg000_30fps_start0000end0121` | 180° | 30 | yes | 良 | 优 | sports_action |
| clip-27df362e84 | douyin | `douyin/yuanzhi/7669015584923487091-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | sports_action |
| clip-2cae3a7397 | douyin | `douyin/yuna/7623834698124381474-seg000_30fps_start0007end0128` | 360° | 30 | yes | 良 | 优 | sports_action |
| clip-cf1ca81131 | pexels | `pexels/2785536-uhd_2160_3840_25fps-seg000_25fps_start0020end0141` | 360° | 25 | — | 良 | 优 | sports_action |
| clip-060efaa0af | douyin | `douyin/maixiaodou/7667952492181989489-seg000_30fps_start0147end0268` | 180° | 30 | yes | 良 | 优 | music_stage |
| clip-de3a61149e | douyin | `douyin/jaychou/7521084289938803977-seg000_30fps_start0420end0541` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-7e61c5717a | douyin | `douyin/karina/7630454610519411968-seg001_30fps_start0000end0121` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-f307ed8575 | douyin | `douyin/dengziqi/7527188690776689978-seg000_30fps_start0234end0355` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-56d3addbe6 | douyin | `douyin/karina/7671207965337152064-seg000_30fps_start0219end0340` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-9f6b02fdb9 | douyin | `douyin/karina/7666559104424872571-seg001_30fps_start0531end0652` | 360° | 30 | yes | 差 | 优 | music_stage |
| clip-fa7fb15c47 | douyin | `douyin/karina/7671284451343104666-seg000_30fps_start0494end0615` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-d8036a8ccd | rednote | `rednote/xinling/69a2b005000000002203bc50-seg000_30fps_start0033end0154` | 360° | 30 | yes | 优 | 差 | music_stage |
| clip-8b3dba948b | rednote | `rednote/xinling/6a36a28d000000000f007b44-seg000_30fps_start0205end0326` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-b4b4a31ed1 | rednote | `rednote/xinling/6a55f755000000001101623d-seg000_30fps_start0022end0143` | 180° | 30 | yes | 良 | 优 | music_stage |
| clip-4a0b076726 | douyin | `douyin/xinling/7666505646174829513-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-4d3a6c9d70 | douyin | `douyin/xinling/7602291565470762575-seg000_30fps_start0010end0131` | 180° | 30 | yes | 差 | 优 | music_stage |
| clip-b1ea861f33 | douyin | `douyin/yuqi/7470049049027169548-seg000_30fps_start1580end1701` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-8b1f4103d5 | douyin | `douyin/yuqi/7417491655714016566-seg000_30fps_start2413end2534` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-11eeb20c2c | douyin | `douyin/aaronkwok/7589247847007762411-seg000_25fps_start0053end0174` | 360° | 25 | yes | 良 | 优 | music_stage |
| clip-1d3a06c671 | douyin | `douyin/angelazhang/7676880442771470335-seg001_30fps_start0010end0131` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-3ec74f303d | douyin | `douyin/maochuan/7646792594659407353-seg000_30fps_start3323end3444` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-f7c3ccb132 | douyin | `douyin/janezhang/7648114866913316136-seg000_30fps_start0348end0469` | 180° | 30 | yes | 良 | 优 | music_stage |
| clip-723277871c | douyin | `douyin/yuna/7420402076573846799-seg000_30fps_start0088end0209` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-02191fa42b | douyin | `douyin/yuna/7553301843347606844-seg000_30fps_start0503end0624` | 360° | 30 | yes | 良 | 优 | music_stage |
| clip-b8ba01cafe | douyin | `douyin/yuna/7618947760523316506-seg001_30fps_start0692end0813` | 360° | 30 | yes | 优 | 良 | music_stage |
| clip-ec814ec5de | youtube | `youtube/jensenhuang/speech_jensen_huang_keynote_bade5a197bfc_121f-seg000_30fps_start0000end0121` | 180° | 30 | yes | 良 | 优 | speech_presentation |
| clip-485080dcb0 | youtube | `youtube/timcook/GYkq9Rgoj8E-seg001_30fps_start207286end207407` | 360° | 30 | yes | 优 | 良 | speech_presentation |
| clip-eb5f380f61 | youtube | `youtube/timcook/GYkq9Rgoj8E-seg003_30fps_start176168end176289` | 360° | 30 | yes | 良 | 优 | speech_presentation |
| clip-6430542596 | youtube | `youtube/timcook/GYkq9Rgoj8E-seg000_30fps_start32000end32121` | 180° | 30 | yes | 优 | 差 | speech_presentation |
| clip-909a69fe98 | youtube | `youtube/robertdowneyjr/speech_robert_downey_jr_sbiff_tribute_acceptance_speech_9f0a262f9707_121f-seg000_30fps_start0000end0121` | 180° | 30 | yes | 优 | 良 | speech_presentation |
| clip-fc46bebd37 | douyin | `douyin/wuyanzu/7572873921628753152-seg000_30fps_start0020end0141` | 360° | 30 | yes | 良 | 优 | speech_presentation |
| clip-1e462b38c8 | youtube | `youtube/timcook/GYkq9Rgoj8E-seg004_30fps_start179075end179196` | 360° | 30 | yes | 优 | 良 | speech_presentation |
| clip-b027aded19 | youtube | `youtube/elonmusk/speech_elon_musk_tesla_shareholder_speech_5cbda31bc0fc_121f-seg000_30fps_start0000end0121` | 360° | 30 | yes | 良 | 优 | speech_presentation |
| clip-2c36f8f213 | douyin | `douyin/karina/7636235583342125302-seg000_30fps_start0040end0161` | 180° | 30 | yes | 良 | 优 | fashion_lifestyle |
| clip-04d06eece7 | pexels | `pexels/15443888_1080_1920_100fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-7d03fee6cf | dymvhuman | `dymvhuman/4K_Studios_Show_Single_f19/25-seg000_30fps_start0061end0182` | 360° | 30 | — | 优 | 良 | fashion_lifestyle |
| clip-75d7ac9a4b | dymvhuman | `dymvhuman/4K_Studios_Show_Single_f17/25-seg000_30fps_start0000end0121` | 360° | 30 | — | 良 | 优 | fashion_lifestyle |
| clip-3b00887900 | pexels | `pexels/5885633-hd_1080_1920_25fps-seg000_25fps_start0315end0436` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-955871822c | pexels | `pexels/5999210-uhd_2160_4096_25fps-seg000_25fps_start0024end0145` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-376f9a0f0d | pexels | `pexels/8431510-uhd_2160_4096_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-93782332c9 | pexels | `pexels/8151974-hd_1080_1920_30fps-seg000_30fps_start0017end0138` | 360° | 30 | — | 良 | 优 | fashion_lifestyle |
| clip-f00c0ec850 | pexels | `pexels/8798401-uhd_2160_4096_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 差 | 优 | fashion_lifestyle |
| clip-1ca1df923d | pexels | `pexels/7761102-uhd_2160_4096_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 良 | 优 | fashion_lifestyle |
| clip-75f8fb8ceb | pexels | `pexels/6834067-hd_1080_1920_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-33a23d21a8 | pexels | `pexels/6616344-hd_1080_1920_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-2c03519cb9 | pexels | `pexels/6616348-hd_1080_1920_25fps-seg000_25fps_start0138end0259` | 360° | 25 | — | 良 | 优 | fashion_lifestyle |
| clip-e9f57b32a6 | pexels | `pexels/15514389_1080_1920_100fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 优 | 良 | fashion_lifestyle |
| clip-6b12eebcef | pexels | `pexels/6191453-uhd_2160_4096_25fps-seg000_25fps_start0000end0121` | 360° | 25 | — | 良 | 优 | fashion_lifestyle |
| clip-132ffc35fc | douyin | `douyin/unitree/7559502724301524284-seg000_30fps_start0225end0346` | 360° | 30 | yes | 优 | 良 | robot |
