package com.mlexpress.customer.data.local.dao

import androidx.room.*
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.OrderStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    
    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC")
    fun getOrdersByUser(userId: String): Flow<List<Order>>
    
    @Query("SELECT * FROM orders WHERE userId = :userId AND status IN (:statuses) ORDER BY createdAt DESC")
    fun getOrdersByUserAndStatus(userId: String, statuses: List<OrderStatus>): Flow<List<Order>>
    
    @Query("SELECT * FROM orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: String): Order?
    
    @Query("SELECT * FROM orders WHERE orderNumber = :orderNumber")
    suspend fun getOrderByNumber(orderNumber: String): Order?
    
    @Query("SELECT * FROM orders WHERE id = :orderId")
    fun getOrderByIdFlow(orderId: String): Flow<Order?>
    
    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC LIMIT :limit")
    suspend fun getRecentOrders(userId: String, limit: Int): List<Order>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: Order)
    
    @Update
    suspend fun updateOrder(order: Order)
    
    @Delete
    suspend fun deleteOrder(order: Order)
    
    @Query("UPDATE orders SET status = :status WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: OrderStatus)
    
    @Query("UPDATE orders SET rating = :rating, feedback = :feedback WHERE id = :orderId")
    suspend fun updateOrderRating(orderId: String, rating: Int, feedback: String?)
    
    @Query("SELECT COUNT(*) FROM orders WHERE userId = :userId")
    suspend fun getOrderCountByUser(userId: String): Int
    
    @Query("SELECT COUNT(*) FROM orders WHERE userId = :userId AND status = :status")
    suspend fun getOrderCountByUserAndStatus(userId: String, status: OrderStatus): Int
    
    @Query("DELETE FROM orders WHERE userId = :userId")
    suspend fun deleteOrdersByUser(userId: String)
    
    @Query("DELETE FROM orders")
    suspend fun clearAllOrders()
}
