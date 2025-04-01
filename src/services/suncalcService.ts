/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

interface SunPosition {
	azimuth: number;
	altitude: number;
}

interface SunTimes {
	solarNoon: Date;
	nadir: Date;
	sunrise: Date;
	sunset: Date;
	sunriseEnd: Date;
	sunsetStart: Date;
	dawn: Date;
	dusk: Date;
	nauticalDawn: Date;
	nauticalDusk: Date;
	nightEnd: Date;
	night: Date;
	goldenHourEnd: Date;
	goldenHour: Date;
}

interface MoonPosition {
	azimuth: number;
	altitude: number;
	distance: number;
	parallacticAngle: number;
}

interface MoonIllumination {
	fraction: number;
	phase: number;
	angle: number;
}

interface MoonTimes {
	rise?: Date;
	set?: Date;
	alwaysUp?: boolean;
	alwaysDown?: boolean;
}

interface SunCalcType {
	getPosition: (date: Date, lat: number, lng: number) => SunPosition;
	getTimes: (
		date: Date,
		lat: number,
		lng: number,
		height?: number,
		inUTC?: boolean,
	) => SunTimes;
	getMoonPosition: (date: Date, lat: number, lng: number) => MoonPosition;
	getMoonIllumination: (date?: Date) => MoonIllumination;
	getMoonTimes: (
		date: Date,
		lat: number,
		lng: number,
		inUTC?: boolean,
	) => MoonTimes;
	addTime: (angle: number, riseName: string, setName: string) => void;
	times: [number, string, string][];
	J0: number;
	julianCycle: (d: number, lw: number) => number;
	approxTransit: (Ht: number, lw: number, n: number) => number;
	solarTransitJ: (ds: number, M: number, L: number) => number;
	hourAngle: (h: number, phi: number, d: number) => number;
	observerAngle: (height: number) => number;
	getSetJ: (
		h: number,
		lw: number,
		phi: number,
		dec: number,
		n: number,
		M: number,
		L: number,
	) => number;
	moonCoords: (d: number) => { ra: number; dec: number; dist: number };
	hoursLater: (date: Date, h: number) => Date;
}

const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const asin = Math.asin;
const atan = Math.atan2;
const acos = Math.acos;
const rad = PI / 180;

// date/time constants and conversions
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;

const toJulian = (date: Date) => {
	return date.valueOf() / dayMs - 0.5 + J1970;
};

const fromJulian = (j: number) => {
	return new Date((j + 0.5 - J1970) * dayMs);
};

const toDays = (date: Date) => {
	return toJulian(date) - J2000;
};

// general calculations for position
const e = rad * 23.4397; // obliquity of the Earth

const rightAscension = (l: number, b: number): number => {
	return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
};

const declination = (l: number, b: number): number => {
	return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
};

const azimuth = (H: number, phi: number, dec: number): number => {
	return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
};

const altitude = (H: number, phi: number, dec: number): number => {
	return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
};

const siderealTime = (d: number, lw: number): number => {
	return rad * (280.16 + 360.9856235 * d) - lw;
};

const astroRefraction = (h: number): number => {
	let altitude = h;
	if (altitude < 0) {
		// the following formula works for positive altitudes only.
		altitude = 0; // if h = -0.08901179 a div/0 would occur.
	}

	// formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
	// 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
	return 0.0002967 / Math.tan(altitude + 0.00312536 / (altitude + 0.08901179));
};

// general sun calculations
const solarMeanAnomaly = (d: number): number => {
	return rad * (357.5291 + 0.98560028 * d);
};

const eclipticLongitude = (M: number): number => {
	const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)); // equation of center
	const P = rad * 102.9372; // perihelion of the Earth

	return M + C + P + PI;
};

const sunCoords = (d: number): { dec: number; ra: number } => {
	const M = solarMeanAnomaly(d);
	const L = eclipticLongitude(M);

	return {
		dec: declination(L, 0),
		ra: rightAscension(L, 0),
	};
};

const SunCalc: SunCalcType = {
	getPosition: (date: Date, lat: number, lng: number): SunPosition => {
		const lw = rad * -lng;
		const phi = rad * lat;
		const d = toDays(date);
		const c = sunCoords(d);
		const H = siderealTime(d, lw) - c.ra;

		return {
			azimuth: azimuth(H, phi, c.dec),
			altitude: altitude(H, phi, c.dec),
		};
	},

	// sun times configuration (angle, morning name, evening name)
	times: [
		[-0.833, "sunrise", "sunset"],
		[-0.3, "sunriseEnd", "sunsetStart"],
		[-6, "dawn", "dusk"],
		[-12, "nauticalDawn", "nauticalDusk"],
		[-18, "nightEnd", "night"],
		[6, "goldenHourEnd", "goldenHour"],
	],

	addTime: (angle: number, riseName: string, setName: string): void => {
		SunCalc.times.push([angle, riseName, setName]);
	},

	// calculations for sun times
	J0: 0.0009,

	julianCycle: (d: number, lw: number): number => {
		return Math.round(d - SunCalc.J0 - lw / (2 * PI));
	},

	approxTransit: (Ht: number, lw: number, n: number): number => {
		return SunCalc.J0 + (Ht + lw) / (2 * PI) + n;
	},

	solarTransitJ: (ds: number, M: number, L: number): number => {
		return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
	},

	hourAngle: (h: number, phi: number, d: number): number => {
		return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d)));
	},

	observerAngle: (height: number): number => {
		return (-2.076 * Math.sqrt(height)) / 60;
	},

	// returns set time for the given sun altitude
	getSetJ: (
		h: number,
		lw: number,
		phi: number,
		dec: number,
		n: number,
		M: number,
		L: number,
	): number => {
		const w = SunCalc.hourAngle(h, phi, dec);
		const a = SunCalc.approxTransit(w, lw, n);
		return SunCalc.solarTransitJ(a, M, L);
	},

	getTimes: (
		date: Date,
		lat: number,
		lng: number,
		height = 0,
		inUTC = false,
	): SunTimes => {
		const t = new Date(date);
		if (inUTC) {
			t.setUTCHours(0, 0, 0, 0);
		} else {
			t.setHours(0, 0, 0, 0);
		}

		const lw = rad * -lng;
		const phi = rad * lat;
		const dh = SunCalc.observerAngle(height);
		const d = toDays(t);
		const n = SunCalc.julianCycle(d, lw);
		const ds = SunCalc.approxTransit(0, lw, n);
		const M = solarMeanAnomaly(ds);
		const L = eclipticLongitude(M);
		const dec = declination(L, 0);
		const Jnoon = SunCalc.solarTransitJ(ds, M, L);

		const result: SunTimes = {
			solarNoon: fromJulian(Jnoon),
			nadir: fromJulian(Jnoon - 0.5),
		} as SunTimes;

		for (let i = 0; i < SunCalc.times.length; i++) {
			const time = SunCalc.times[i];
			const h0 = (time[0] + dh) * rad;

			const Jset = SunCalc.getSetJ(h0, lw, phi, dec, n, M, L);
			const Jrise = Jnoon - (Jset - Jnoon);

			result[time[1] as keyof SunTimes] = fromJulian(Jrise);
			result[time[2] as keyof SunTimes] = fromJulian(Jset);
		}

		return result;
	},

	// moon calculations
	moonCoords: (d: number): { ra: number; dec: number; dist: number } => {
		// geocentric ecliptic coordinates of the moon
		const L = rad * (218.316 + 13.176396 * d); // ecliptic longitude
		const M = rad * (134.963 + 13.064993 * d); // mean anomaly
		const F = rad * (93.272 + 13.22935 * d); // mean distance
		const l = L + rad * 6.289 * sin(M); // longitude
		const b = rad * 5.128 * sin(F); // latitude
		const dt = 385001 - 20905 * cos(M); // distance to the moon in km

		return {
			ra: rightAscension(l, b),
			dec: declination(l, b),
			dist: dt,
		};
	},

	getMoonPosition: (date: Date, lat: number, lng: number): MoonPosition => {
		const lw = rad * -lng;
		const phi = rad * lat;
		const d = toDays(date);
		const c = SunCalc.moonCoords(d);
		const H = siderealTime(d, lw) - c.ra;
		let h = altitude(H, phi, c.dec);
		const pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

		h = h + astroRefraction(h); // altitude correction for refraction

		return {
			azimuth: azimuth(H, phi, c.dec),
			altitude: h,
			distance: c.dist,
			parallacticAngle: pa,
		};
	},

	getMoonIllumination: (date: Date = new Date()): MoonIllumination => {
		const d = toDays(date);
		const s = sunCoords(d);
		const m = SunCalc.moonCoords(d);
		const sdist = 149598000; // distance from Earth to Sun in km
		const phi = acos(
			sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra),
		);
		const inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi));
		const angle = atan(
			cos(s.dec) * sin(s.ra - m.ra),
			sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra),
		);

		return {
			fraction: (1 + cos(inc)) / 2,
			phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI,
			angle: angle,
		};
	},

	hoursLater: (date: Date, h: number): Date => {
		return new Date(date.valueOf() + (h * dayMs) / 24);
	},

	getMoonTimes: (
		date: Date,
		lat: number,
		lng: number,
		inUTC = false,
	): MoonTimes => {
		const t = new Date(date);
		if (inUTC) {
			t.setUTCHours(0, 0, 0, 0);
		} else {
			t.setHours(0, 0, 0, 0);
		}

		const hc = 0.133 * rad;
		let h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc;
		let h1 = 0;
		let h2 = 0;
		let rise: number | undefined;
		let set: number | undefined;
		let a = 0;
		let b = 0;
		let xe = 0;
		let ye = 0;
		let d = 0;
		let roots = 0;
		let x1: number | undefined;
		let x2: number | undefined;
		let dx = 0;
		let alwaysUp = false;

		// go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
		for (let i = 1; i <= 24; i += 2) {
			h1 =
				SunCalc.getMoonPosition(SunCalc.hoursLater(t, i), lat, lng).altitude -
				hc;
			h2 =
				SunCalc.getMoonPosition(SunCalc.hoursLater(t, i + 1), lat, lng)
					.altitude - hc;

			a = (h0 + h2) / 2 - h1;
			b = (h2 - h0) / 2;
			xe = -b / (2 * a);
			ye = (a * xe + b) * xe + h1;
			d = b * b - 4 * a * h1;
			roots = 0;

			if (d >= 0) {
				dx = Math.sqrt(d) / (Math.abs(a) * 2);
				x1 = xe - dx;
				x2 = xe + dx;
				if (Math.abs(x1) <= 1) roots++;
				if (Math.abs(x2) <= 1) roots++;
				if (x1 < -1) x1 = x2;
			}

			if (roots === 1) {
				if (h0 < 0) rise = i + (x1 ?? 0);
				else set = i + (x1 ?? 0);
			} else if (roots === 2) {
				rise = i + (ye < 0 ? (x2 ?? 0) : (x1 ?? 0));
				set = i + (ye < 0 ? (x1 ?? 0) : (x2 ?? 0));
			}

			if (rise && set) break;

			h0 = h2;
		}

		const result: MoonTimes = {};

		if (rise) result.rise = SunCalc.hoursLater(t, rise);
		if (set) result.set = SunCalc.hoursLater(t, set);

		if (!rise && !set) {
			alwaysUp = ye > 0;
			result[alwaysUp ? "alwaysUp" : "alwaysDown"] = true;
		}

		return result;
	},
};

export default SunCalc;
