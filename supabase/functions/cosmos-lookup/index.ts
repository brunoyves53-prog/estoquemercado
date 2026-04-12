const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode } = await req.json()
    if (!barcode || typeof barcode !== 'string') {
      return new Response(JSON.stringify({ error: 'Barcode is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = Deno.env.get('COSMOS_API_TOKEN')
    if (!token) {
      return new Response(JSON.stringify({ error: 'COSMOS_API_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${barcode}`, {
      headers: {
        'X-Cosmos-Token': token,
        'User-Agent': 'Cosmos-API-Request',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      return new Response(JSON.stringify({ found: false, detail: body }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify({
      found: true,
      nome: data.description || '',
      imagemUrl: data.thumbnail || null,
      marca: data.brand?.name || '',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ found: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
