import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(){
 return NextResponse.json({
  supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  nameLookup:'curated-candidates-only',
  monitoringConfigured:process.env.MEDPRO_MONITORING_ENABLED==='true',
  signedUpdatesConfigured:Boolean(process.env.NEXT_PUBLIC_ALERT_SIGNING_KEY),
  barcodeLookup:Boolean(process.env.OPENMRP_API_KEY),
  indiaAlerts:'official-cdsco-history-and-live-latest',
 },{headers:{'Cache-Control':'no-store'}});
}
