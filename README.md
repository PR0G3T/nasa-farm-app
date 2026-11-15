# FARM

*NASA Space Apps Challenge 2026 — [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)*

> *"Farmers around the world navigate shifting temperatures, changing rainfall
> patterns, water shortages, extreme weather, and declining soil health."*

FARM is our answer to that challenge: a **decision-support tool** that
combines NASA Earth observations with local soil data, crop characteristics and
farmer priorities to help growers and their advisers explore crop-rotation
strategies that strengthen soil health, conserve water, and adapt each field
to changing conditions.

## The challenge

Choosing what to plant — and in what sequence — is the most consequential
decision made on a parcel, and it is getting harder. Rainfall patterns are
shifting, heat stress arrives earlier, water is scarcer, and soils are
declining. A rotation that worked for decades can quietly become a losing bet.

At the same time, NASA satellites observe every field on Earth, every few
days, for free — soil moisture, canopy water use, heat stress, rainfall,
vegetation vigor. But that data is produced for continents, not for the
thirty-acre parcel behind the barn. Nothing in the raw feed says *"your east
field dried out faster than your neighbors'"*, let alone what to plant there
next.

FARM closes that gap: it brings NASA's broad-area Earth observations
down to the level of one field, and turns them into a concrete, explainable
recommendation.

## What the app does

**See the field the way satellites see it.**
The map renders real satellite observations — true colour, vegetation vigor,
canopy water content, and surface temperature — with a legend that places your
parcel *relative to its neighbors*. A vigor reading only means something when
you know where the sector stands.

**Rewind the season.**
A timeline replays several months of observations. Events that matter — a
vegetation crash, a heat spike, the field drying out while neighbors stayed
green — are detected automatically and marked, so a season's history reads in
seconds.

**Explore rotation strategies — with evidence, not guesses.**
For the selected parcel, the model evaluates a full set of candidate
multi-year rotations — including the field's current one — and scores each on
expected yield, water demand, days of crop stress, and soil-carbon impact.
The essentials stay on top: the suggested sequence and its score. Agronomists
can open the *Experiment* section to compare every candidate, set their own
priorities (yield vs water savings vs soil health vs risk), and re-rank
accordingly.

**Stress-test against the future.**
Each rotation can be replayed under climate scenarios — roughly +2 °C, or
−20 % rainfall. A rotation that only works in today's climate is a bet; one
that ranks well under every scenario is a plan.

**Know the parcel.**
A second tab gathers the non-visual facts an adviser checks first: current
crop, the rotation history reconstructed from satellite land-use
classification, soil texture / pH / organic carbon, recent weather, and the
latest satellite readings.

## How it works, in one paragraph

A prediction engine combines parcel boundaries and crop history (rebuilt from
satellite land-use classification), local soil profiles, and daily weather
observations, then simulates each candidate rotation forward through time —
crop growth, water balance, nitrogen and carbon cycling — corrected by a
learned component trained on what satellites actually measured. Every
rotation is scored on the objectives above and ranked. The app presents the
winner and lets you interrogate the runner-ups. Methodology, architecture and
results are detailed in the companion research paper (link below).

## Data

Every product below is one the pipeline actually consumes — NASA missions for
climate and field signals, public surveys for the local soil and crop context
the challenge asks to source separately.

**NASA Earth observations**

- [NASA POWER, Agroclimatology](https://power.larc.nasa.gov/) — daily
  temperature, rainfall, solar radiation and humidity per parcel
- [Harmonized Landsat–Sentinel-2, 30 m vegetation indices](https://lpdaac.usgs.gov/products/hlsl30_viv002/)
  ([L30](https://lpdaac.usgs.gov/products/hlsl30_viv002/) /
  [S30](https://lpdaac.usgs.gov/products/hlss30_viv002/), `HLSL30_VI`,
  `HLSS30_VI`) — vigor and canopy-water layers every few days
- [ECOSTRESS evapotranspiration](https://lpdaac.usgs.gov/products/eco_l3t_jetv003/)
  (`ECO_L3T_JET`, ~70 m) — how much water the crop is actually using
- [ECOSTRESS land surface temperature](https://lpdaac.usgs.gov/products/eco_l2t_lstev002/)
  (`ECO_L2T_LSTE`) — the heat-stress layer
- [SMAP enhanced soil moisture](https://nsidc.org/data/spl3smp_e/versions/6)
  (`SPL3SMP_E`, 9 km daily) — surface water-stress context
- [GPM IMERG daily precipitation](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary)
  (`GPM_3IMERGDF`, 0.1°) — satellite rainfall record
- [GLDAS GRACE-data-assimilation](https://disc.gsfc.nasa.gov/datasets/GLDAS_CLSM025_DA1_D_2.2/summary)
  (`GLDAS_CLSM025_DA1_D`) — water storage and root-zone moisture
- [GRACE / GRACE-FO mascon](https://podaac.jpl.nasa.gov/dataset/TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4)
  (`TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4`) — monthly aquifer and water
  storage trend for the region
- [NISAR](https://nisar.jpl.nasa.gov/data/) (`NISAR_L2_GCOV`,
  `NISAR_L3_SME2` beta products) — radar soil moisture where available

**Local soil & crop data** *(not NASA products — public surveys, as the
challenge suggests)*

- [SoilGrids](https://soilgrids.org/) — soil texture, bulk density, organic
  carbon, pH profiles
- [USDA Crop Sequence Boundaries](https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php)
  and [Cropland Data Layer](https://www.nass.usda.gov/Research_and_Science/Cropland/Release/index.php) —
  parcel boundaries and per-year crop classification (rotation history)
- [USDA NASS QuickStats](https://quickstats.nass.usda.gov/) — regional yield
  references used to calibrate crop behavior

## Demo

<video src="https://raw.githubusercontent.com/PR0G3T/nasa-farm-app/main/Presentation_Video.mp4" controls width="100%"></video>

[Watch the presentation video](Presentation_Video.mp4)

## Links

- Prediction engine & data backend:
  [nasa-farm-jepa](https://github.com/PR0G3T/nasa-farm-jepa)
- Research paper (methodology and results):
  [A Differentiable Physics–Residual World Model for Crop-Rotation Decision Support on NASA Earth Observations](https://github.com/PR0G3T/nasa-farm-jepa/blob/main/A%20Differentiable%20Physics%E2%80%93Residual%20World%20Model%20for%20Crop-Rotation%20Decision%20Support%20on%20NASA%20Earth%20Observations.pdf)
- Deployed API: [https://41kbfozcezrjypq1ig3vgwro.d3vex.fr](https://41kbfozcezrjypq1ig3vgwro.d3vex.fr)

## Run it locally

```sh
bun install
bun run dev
```

The app talks to the deployed backend by default; point `FARM_API` in `.env`
at a local `nasa-farm-jepa` instance to run everything on your machine.
