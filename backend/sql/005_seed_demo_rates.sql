-- Rate sets.
-- DEMO-2026-27 : placeholder rates for DETAILED (and QUICK) mode. Published = the single active set. is_verified = false.
-- SAMPLE-FIXTURE: reproduces the reference sample in QUICK mode; stays DRAFT (use the admin preview calculator).
-- Every rupee value here is ILLUSTRATIVE. Replace with official Maharashtra PWD SSR / MJP SSR data before launch.

insert into rate_sets (name, fiscal_year, source_label, status, effective_from, is_verified) values
('DEMO-2026-27','2026-27','Illustrative placeholder rates (not official SSR)','draft','2026-04-01',false),
('SAMPLE-FIXTURE','2026-27','Reference sample fixture for QUICK-mode regression','draft','2026-04-01',false);

insert into rate_items
 (rate_set_id,item_code,category,description,unit,base_rate,source,source_ref,labour_pct,lead_lift_applied,"group")
select s.id, v.item_code, v.category, v.description, v.unit, v.base_rate, 'CUSTOM', 'DEMO placeholder', v.labour_pct, false, v.grp
from rate_sets s,
(values
 ('S01','SITE','Site clearing and levelling','sqm',45,90,'structure'),
 ('S02','SITE','Excavation for foundation','cum',320,90,'structure'),
 ('S03','SITE','Backfill and plinth filling','cum',280,85,'structure'),
 ('F01','FOUNDATION','PCC M10 bed','cum',5800,30,'structure'),
 ('F02','FOUNDATION','RCC M20 footings, plinth beams','cum',9200,28,'structure'),
 ('F03','FOUNDATION','DPC with waterproofing compound','sqm',260,35,'structure'),
 ('F04','FOUNDATION','Anti-termite treatment','sqm',95,40,'structure'),
 ('R01','SUPERSTRUCTURE','RCC M20 columns, beams, slabs, stairs','cum',10500,28,'structure'),
 ('R02','SUPERSTRUCTURE','Reinforcement steel Fe500D, supply and fix','kg',78,14,'structure'),
 ('M01','MASONRY','Brick/block masonry 230 mm','cum',7400,35,'structure'),
 ('M02','MASONRY','Brick/block masonry 115 mm','cum',7100,38,'structure'),
 ('M03','MASONRY','Parapet wall','rm',1150,40,'structure'),
 ('P01','PLASTER','Internal plaster 12 mm','sqm',310,48,'structure'),
 ('P02','PLASTER','Ceiling plaster','sqm',290,50,'structure'),
 ('P03','PLASTER','External plaster 20 mm','sqm',420,50,'structure'),
 ('FL01','FLOORING','Floor tiles for rooms','sqm',1150,28,'finishing'),
 ('FL02','FLOORING','Bathroom floor and wall tiles','sqm',1350,35,'finishing'),
 ('FL03','FLOORING','Kitchen platform and dado','set',38000,25,'finishing'),
 ('FL04','FLOORING','Skirting','rm',140,40,'finishing'),
 ('FL05','FLOORING','Staircase treads and risers','flight',35000,35,'finishing'),
 ('D01','OPENINGS','Main door','no',28000,12,'openings'),
 ('D02','OPENINGS','Internal flush doors','no',11000,15,'openings'),
 ('D03','OPENINGS','Bathroom doors','no',6500,15,'openings'),
 ('W01','OPENINGS','Windows with glass','no',9500,15,'openings'),
 ('W02','OPENINGS','MS safety grills for windows','no',4200,35,'openings'),
 ('PT01','PAINTING','Putty, primer, emulsion internal','sqm',72,50,'finishing'),
 ('PT02','PAINTING','Weatherproof external paint','sqm',95,50,'finishing'),
 ('PT03','PAINTING','Enamel on doors and grills','no',1100,65,'finishing'),
 ('E01','ELECTRICAL','Electrical points, all-in wiring','pt',1400,30,'electrical'),
 ('E02','ELECTRICAL','Distribution board with MCB/RCCB','no',4800,20,'electrical'),
 ('E03','ELECTRICAL','Meter board, service line, earthing','LS',28000,30,'electrical'),
 ('E04','ELECTRICAL','Fan and light fixtures allowance','pt',900,12,'electrical'),
 ('PL01','PLUMBING','Bathroom set: WC, basin, CP fittings','set',48000,22,'plumbing'),
 ('PL02','PLUMBING','Kitchen sink and fittings','set',18000,25,'plumbing'),
 ('PL03','PLUMBING','Supply and drainage piping','rm',280,35,'plumbing'),
 ('PL04','WATER','Overhead water tank','litre',12,20,'plumbing'),
 ('PL05S','WATER','Septic tank and soak pit, class S','set',55000,40,'plumbing'),
 ('PL05M','WATER','Septic tank and soak pit, class M','set',85000,40,'plumbing'),
 ('PL05L','WATER','Septic tank and soak pit, class L','set',130000,40,'plumbing'),
 ('ADD_WATERPROOF','FINISHING','Terrace and wet-area waterproofing','sqm',480,40,'finishing'),
 ('ADD_FALSE_CEILING','FINISHING','Gypsum false ceiling','sqm',85,40,'finishing'),
 ('ADD_POP','FINISHING','POP cornice / punning in rooms','rm',120,45,'finishing'),
 ('ADD_MODULAR_KITCHEN','FINISHING','Modular kitchen cabinets','set',140000,25,'finishing'),
 ('ADD_WARDROBE','FINISHING','Built-in wardrobes','no',45000,25,'finishing'),
 ('ADD_ELEVATION','FINISHING','Stone/ACP elevation feature','sqm',1800,35,'finishing'),
 ('ADD_COMPOUND_WALL','FINISHING','Compound wall','rm',4500,40,'finishing'),
 ('ADD_GATE','FINISHING','Main gate and pedestrian gate','set',65000,30,'finishing'),
 ('ADD_BOREWELL','FINISHING','Borewell with casing','LS',110000,30,'finishing'),
 ('ADD_SOLAR_HEATER','FINISHING','Solar water heater (100-200 L)','no',38000,15,'finishing'),
 ('ADD_RWH','FINISHING','Rainwater harvesting pit','no',40000,40,'finishing'),
 ('ADD_LANDSCAPE','FINISHING','Paving and landscaping','sqm',650,50,'finishing'),
 ('ADD_SECURITY','FINISHING','CCTV / video door phone','LS',55000,20,'finishing'),
 ('Q_STRUCT','QUICK','Structure composite, Standard','sqm',9200,35,'structure'),
 ('Q_ELEC_POINT','QUICK','Electrical, all-in per point','point',1400,30,'electrical'),
 ('Q_ELEC_WIRING_SQM','QUICK','Extra wiring rate per sqm','sqm',0,30,'electrical'),
 ('Q_BATH_SET','QUICK','Bathroom set','set',48000,30,'plumbing'),
 ('Q_KITCHEN_SET','QUICK','Kitchen sink set','set',18000,30,'plumbing'),
 ('Q_PIPING_RM','QUICK','Piping per metre','m',280,30,'plumbing'),
 ('Q_FLOOR','QUICK','Standard vitrified flooring','sqm',1150,30,'finishing'),
 ('Q_PAINT','QUICK','Painting average (int + ext)','sqm',190,45,'finishing'),
 ('Q_DOOR','QUICK','Door average','no',14000,15,'openings'),
 ('Q_WINDOW','QUICK','Window average','no',9500,15,'openings')
) as v(item_code,category,description,unit,base_rate,labour_pct,grp)
where s.name = 'DEMO-2026-27';

-- SAMPLE-FIXTURE set (A.5a): reproduces 19,49,420 in QUICK mode
insert into rate_items
 (rate_set_id,item_code,category,description,unit,base_rate,source,source_ref,labour_pct,lead_lift_applied,"group")
select s.id, v.item_code, 'QUICK', v.description, v.unit, v.base_rate, 'CUSTOM', 'Reference sample fixture', v.labour_pct, false, v.grp
from rate_sets s,
(values
 ('Q_STRUCT','Structure composite, Standard','sqm',4500,35,'structure'),
 ('Q_ELEC_POINT','Electrical, all-in per point','point',1400,30,'electrical'),
 ('Q_ELEC_WIRING_SQM','Extra wiring rate per sqm','sqm',0,30,'electrical'),
 ('Q_BATH_SET','Bathroom set (MJP style)','set',45000,30,'plumbing'),
 ('Q_KITCHEN_SET','Kitchen sink set','set',25000,30,'plumbing'),
 ('Q_PIPING_RM','Piping per metre','m',250,30,'plumbing'),
 ('Q_FLOOR','Standard vitrified flooring','sqm',950,30,'finishing'),
 ('Q_PAINT','Painting average (int + ext)','sqm',180,45,'finishing'),
 ('Q_DOOR','Door average','no',12500,15,'openings'),
 ('Q_WINDOW','Window average','no',7250,15,'openings')
) as v(item_code,description,unit,base_rate,labour_pct,grp)
where s.name = 'SAMPLE-FIXTURE';

-- Publish the DEMO set as the single active set (also writes rate_history).
select publish_rate_set((select id from rate_sets where name = 'DEMO-2026-27'), null);
