import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, MapPin, Calendar, Fuel, Gauge } from "lucide-react";

export default function BuscarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">LeilãoMax</h1>
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input 
                  placeholder="Buscar veículos..." 
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-72 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Localização</label>
                  <Input placeholder="Estado" className="mb-2" />
                  <Input placeholder="Cidade" />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Veículo</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Carro</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Moto</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Caminhão</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Faixa de Preço</label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Min" />
                    <Input type="number" placeholder="Max" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Ano</label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="De" />
                    <Input type="number" placeholder="Até" />
                  </div>
                </div>

                <Button className="w-full">Aplicar Filtros</Button>
              </CardContent>
            </Card>
          </aside>

          {/* Results Grid */}
          <main className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando <strong>248 veículos</strong>
              </p>
              <select className="text-sm border rounded-md px-3 py-2">
                <option>Melhor Score</option>
                <option>Menor Preço</option>
                <option>Maior Desconto FIPE</option>
                <option>Mais Recente</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Vehicle Card Example */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative h-48 bg-gray-200">
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    Score: 87
                  </Badge>
                  <img 
                    src="/placeholder-car.jpg" 
                    alt="Veículo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">FIAT UNO MILLE 1.0 2015</h3>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>São Paulo, SP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Leilão: 15/10/2025</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      <span>45.000 km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      <span>Flex • Manual</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-2xl font-bold text-primary">R$ 18.500</p>
                      <p className="text-xs text-muted-foreground">
                        FIPE: R$ 25.000 <span className="text-green-600 font-medium">(-26%)</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Excelente
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* More vehicle cards would be rendered here */}
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative h-48 bg-gray-200">
                  <Badge className="absolute top-2 right-2 bg-blue-500">
                    Score: 72
                  </Badge>
                  <img 
                    src="/placeholder-car.jpg" 
                    alt="Veículo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">HONDA CIVIC LXR 2.0 2018</h3>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Rio de Janeiro, RJ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Leilão: 18/10/2025</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      <span>68.000 km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      <span>Flex • Automático</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-2xl font-bold text-primary">R$ 58.900</p>
                      <p className="text-xs text-muted-foreground">
                        FIPE: R$ 68.000 <span className="text-green-600 font-medium">(-13%)</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Bom Negócio
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" size="sm">Anterior</Button>
              <Button variant="outline" size="sm">1</Button>
              <Button size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">4</Button>
              <Button variant="outline" size="sm">Próximo</Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
