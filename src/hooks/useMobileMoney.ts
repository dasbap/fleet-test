import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { PaymentTransactionRepository } from "@/repositories/payment-transaction.repository";
import { MobileMoneyService } from "@/services/mobile-money.service";

const paymentTransactionRepository = new PaymentTransactionRepository();
const mobileMoneyService = new MobileMoneyService(paymentTransactionRepository);

export function useStartMobileMoneyPayment() {
  return useMutation({
    mutationFn: mobileMoneyService.startPayment.bind(mobileMoneyService),
    onError: (error: Error) => {
      toast({
        title: "Paiement indisponible",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConfirmMobileMoneyPayment() {
  return useMutation({
    mutationFn: ({
      transactionId,
      success,
    }: {
      transactionId: string;
      success?: boolean;
    }) => mobileMoneyService.confirmPayment(transactionId, success),
    onError: (error: Error) => {
      toast({
        title: "Confirmation impossible",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
