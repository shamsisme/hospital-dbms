import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [bedStats, icuStats, triageStats, activeStats, ventilatorStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*)::int AS total_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Occupied')::int AS occupied_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Available')::int AS available_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Sanitizing')::int AS sanitizing_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Out-Of-Service')::int AS oos_beds
        FROM wards_beds
      `),
      query(`
        SELECT 
          COUNT(*)::int AS total_icu_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Available')::int AS available_icu_beds,
          COUNT(*) FILTER (WHERE operational_status = 'Occupied')::int AS occupied_icu_beds
        FROM wards_beds
        WHERE ward_type IN ('ICU', 'CCU')
      `),
      query(`
        SELECT 
          COUNT(*)::int AS critical_triage_count,
          COUNT(*) FILTER (WHERE triage_priority = 1)::int AS esi_1_resus,
          COUNT(*) FILTER (WHERE triage_priority = 2)::int AS esi_2_emergent,
          COUNT(*) FILTER (WHERE triage_priority = 3)::int AS esi_3_urgent,
          COUNT(*) FILTER (WHERE triage_priority >= 4)::int AS esi_4_5_stable
        FROM admissions
        WHERE discharge_time IS NULL AND admission_status = 'Admitted'
      `),
      query(`
        SELECT COUNT(*)::int AS total_active_inpatients
        FROM admissions
        WHERE discharge_time IS NULL AND admission_status = 'Admitted'
      `),
      query(`
        SELECT 
          COUNT(*)::int AS total_ventilators,
          COUNT(*) FILTER (WHERE operational_status = 'Occupied')::int AS in_use_ventilators,
          COUNT(*) FILTER (WHERE operational_status = 'Available')::int AS available_ventilators
        FROM wards_beds
        WHERE has_ventilator = true
      `),
    ]);

    const bedData = bedStats.rows[0];
    const icuData = icuStats.rows[0];
    const triageData = triageStats.rows[0];
    const activeData = activeStats.rows[0];
    const ventData = ventilatorStats.rows[0];

    const occupancyRate = bedData.total_beds > 0
      ? Math.round((bedData.occupied_beds / bedData.total_beds) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalBeds: bedData.total_beds,
        occupiedBeds: bedData.occupied_beds,
        availableBeds: bedData.available_beds,
        sanitizingBeds: bedData.sanitizing_beds,
        oosBeds: bedData.oos_beds,
        occupancyRate,
        availableIcuBeds: icuData.available_icu_beds,
        totalIcuBeds: icuData.total_icu_beds,
        occupiedIcuBeds: icuData.occupied_icu_beds,
        criticalTriageCount: triageData.critical_triage_count,
        esi1Resus: triageData.esi_1_resus,
        esi2Emergent: triageData.esi_2_emergent,
        esi3Urgent: triageData.esi_3_urgent,
        esiStable: triageData.esi_4_5_stable,
        activeInpatients: activeData.total_active_inpatients,
        totalVentilators: ventData.total_ventilators,
        inUseVentilators: ventData.in_use_ventilators,
        availableVentilators: ventData.available_ventilators,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch clinical metrics' },
      { status: 500 }
    );
  }
}
