import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/landfill — get recommended landfill based on day of week + crew GPS
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  const { data: landfills, error } = await supabaseAdmin
    .from('landfills')
    .select('*')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const month = now.getMonth() + 1; // 1-12
  const isWinter = month >= 11 || month <= 3; // Nov-Mar
  const isSunday = dayOfWeek === 0;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // Filter landfills open today
  let available = (landfills || []).filter((l) => {
    if (isSunday) {
      if (!l.sunday_open) return false;
      // East Calgary is summer-only on Sundays (April-October)
      if (l.summer_only_sunday && isWinter) return false;
      return true;
    }
    if (isWeekday) return l.monday_to_friday !== false;
    // Saturday — all landfills are open
    return true;
  });

  if (available.length === 0) {
    // Fallback: show all landfills with a warning
    available = landfills || [];
  }

  // Calculate distance if GPS provided
  if (!isNaN(lat) && !isNaN(lng)) {
    available = available.map((l) => ({
      ...l,
      distance_km: l.lat && l.lng
        ? Math.round(haversine(lat, lng, l.lat, l.lng) * 10) / 10
        : null,
    }));
    available.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
  }

  const recommended = available[0] || null;
  const warnings = [];
  if (isSunday && isWinter) {
    warnings.push('East Calgary Landfill is closed on Sundays during winter (Nov-Mar). Spyhill and Shepard are closed on Sundays.');
  }
  if (isSunday && !isWinter && recommended?.summer_only_sunday) {
    warnings.push('East Calgary Landfill Sunday hours are seasonal (April-October only).');
  }

  return NextResponse.json({
    recommended,
    all: available,
    warnings,
    day_of_week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
    is_sunday: isSunday,
  });
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
